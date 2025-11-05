# tournaments/views.py
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import models
from django.db.models import Q
from .models import Venue, Tournament, Team, Registration, Match, Player, TeamPlayer
from .serializers import VenueSerializer, TournamentSerializer, TeamSerializer, RegistrationSerializer, MatchSerializer, UserSerializer, RegistrationCreateSerializer, PlayerSerializer, TeamPlayerSerializer
from .permissions import IsOrganizerOrReadOnly, IsOrganizerOfRelatedTournamentOrReadOnly, IsTeamManagerOrHost, IsTournamentOrganiser, IsTeamManagerOrReadOnly
from accounts.serializers import UserWithRoleSerializer

class RegisterView(APIView):
    """
    User registration endpoint
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        
        if not all([username, email, password, first_name, last_name]):
            return Response(
                {'detail': 'All fields are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'detail': 'Email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            # Set role_hint to host for tournament organizers
            from accounts.models import UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role_hint = 'host'
            profile.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'detail': 'User created successfully',
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'detail': f'Error creating user: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer

class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_permissions(self):
        """Apply different permissions based on action"""
        if self.action in ['list', 'retrieve', 'register', 'standings', 'top-scorers', 'role']:
            permission_classes = [AllowAny]
        elif self.action in ['update', 'partial_update', 'destroy', 'generate_fixtures', 'publish']:
            permission_classes = [IsAuthenticated, IsTournamentOrganiser]
        elif self.action == 'create':
            permission_classes = [IsAuthenticated]  # Any authenticated user can create
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        tournament = serializer.save(organizer=self.request.user)
        # Ensure user's role_hint is set to host
        if hasattr(self.request.user, 'profile'):
            profile = self.request.user.profile
            if profile.role_hint != 'host':
                profile.role_hint = 'host'
                profile.save()
        return tournament
    
    @action(detail=False, methods=['get'])
    def mine(self, request):
        """Get tournaments organized by the current user"""
        tournaments = self.queryset.filter(organizer=request.user)
        serializer = self.get_serializer(tournaments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='standings')
    def standings(self, request, pk=None):
        """Get tournament standings calculated from matches"""
        tournament = self.get_object()
        teams = Team.objects.filter(registrations__tournament=tournament, registrations__status__in=['pending', 'paid']).distinct()
        
        standings = []
        for team in teams:
            # Get matches for this team in this tournament
            matches = Match.objects.filter(
                tournament=tournament,
                status='finished'
            ).filter(
                models.Q(home_team=team) | models.Q(away_team=team)
            )
            
            played = matches.count()
            wins = 0
            draws = 0
            losses = 0
            goals_for = 0
            goals_against = 0
            
            for match in matches:
                if match.home_team == team:
                    gf = match.home_score
                    ga = match.away_score
                else:
                    gf = match.away_score
                    ga = match.home_score
                
                goals_for += gf
                goals_against += ga
                
                if gf > ga:
                    wins += 1
                elif gf == ga:
                    draws += 1
                else:
                    losses += 1
            
            points = wins * 3 + draws
            standings.append({
                'team': TeamSerializer(team).data,
                'played': played,
                'won': wins,
                'drawn': draws,
                'lost': losses,
                'points': points,
                'goals_for': goals_for,
                'goals_against': goals_against,
                'goal_difference': goals_for - goals_against
            })
        
        # Sort by points, then goal difference, then goals for
        standings.sort(key=lambda x: (-x['points'], -x['goal_difference'], -x['goals_for']))
        
        # Add position
        for i, standing in enumerate(standings, 1):
            standing['position'] = i
        
        return Response(standings)
    
    @action(detail=True, methods=['get'], url_path='top-scorers')
    def top_scorers(self, request, pk=None):
        """Get top scorers for the tournament (public endpoint)"""
        tournament = self.get_object()
        # Get all teams in this tournament
        team_ids = Team.objects.filter(
            registrations__tournament=tournament,
            registrations__status__in=['pending', 'paid']
        ).values_list('id', flat=True)
        
        # Get players from those teams
        players = Player.objects.filter(
            memberships__team_id__in=team_ids,
            goals__gt=0
        ).order_by('-goals')[:10]
        
        scorers = []
        for player in players:
            # Get team name for this player
            team_membership = TeamPlayer.objects.filter(
                player=player,
                team_id__in=team_ids
            ).select_related('team').first()
            
            team_name = team_membership.team.name if team_membership else 'Unknown'
            
            scorers.append({
                'name': f"{player.first_name} {player.last_name}".strip(),
                'team': team_name,
                'goals': player.goals or 0
            })
        
        return Response(scorers)
    
    @action(detail=True, methods=['get'], url_path='role')
    def role(self, request, pk=None):
        """Get user's role for this tournament"""
        tournament = self.get_object()
        is_organiser = request.user.is_authenticated and tournament.organizer_id == request.user.id
        
        # Check if user manages any team in this tournament
        is_manager = False
        if request.user.is_authenticated:
            is_manager = Team.objects.filter(
                registrations__tournament=tournament,
                manager_user=request.user
            ).exists()
        
        return Response({
            'is_organiser': is_organiser,
            'is_manager': is_manager
        })
    
    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        """Publish tournament - set status to 'open' (organiser only)"""
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organiser can publish tournaments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tournament.status = 'open'
        tournament.save()
        
        return Response({
            'detail': 'Tournament published successfully',
            'tournament_id': tournament.id,
            'status': tournament.status
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='generate-fixtures')
    def generate_fixtures(self, request, pk=None):
        """Generate fixtures for tournament (organiser only)"""
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organiser can generate fixtures'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Stub for now - actual fixture generation logic can be added later
        # This will use tournament.format and tournament.structure to generate matches
        return Response({
            'detail': 'Fixtures generation triggered (stub)',
            'tournament_id': tournament.id,
            'format': tournament.format
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='register')
    def register(self, request, pk=None):
        """
        Register a team for this tournament.
        Accepts team data and creates a new registration.
        """
        tournament = self.get_object()
        
        # Prepare data with tournament_id from URL
        data = request.data.copy()
        data['tournament_id'] = tournament.id
        
        serializer = RegistrationCreateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            registration = serializer.save()
            
            # Get the serialized representation which includes tokens if user was created
            response_data = serializer.to_representation(registration)
            
            return Response(
                response_data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsTeamManagerOrReadOnly]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class RegistrationViewSet(mixins.CreateModelMixin,
                          mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.UpdateModelMixin,
                          mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    queryset = Registration.objects.select_related("tournament","team").all()
    serializer_class = RegistrationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOrganizerOfRelatedTournamentOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        tid = self.request.query_params.get("tournament")
        return qs.filter(tournament_id=tid) if tid else qs
    
    @action(detail=True, methods=['get'], url_path='status')
    def status(self, request, pk=None):
        """Get registration status for polling (public endpoint)"""
        from .guards import get_registration_status
        registration_id = int(pk)
        status_data = get_registration_status(request.user if request.user.is_authenticated else None, registration_id)
        return Response(status_data)

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.select_related("tournament","home_team","away_team").all()
    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOrganizerOfRelatedTournamentOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        tid = self.request.query_params.get("tournament")
        team_id = self.request.query_params.get("team")
        
        if tid:
            qs = qs.filter(tournament_id=tid)
        if team_id:
            # Filter matches where team is either home or away
            qs = qs.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
        
        return qs

    @action(detail=True, methods=['post'], url_path='score', permission_classes=[IsTeamManagerOrHost])
    def set_score(self, request, pk=None):
        match = self.get_object()
        try:
            hs = int(request.data.get('home_score'))
            as_ = int(request.data.get('away_score'))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid score'}, status=status.HTTP_400_BAD_REQUEST)
        match.home_score = max(0, hs)
        match.away_score = max(0, as_)
        match.status = 'finished'
        match.save()
        return Response(self.get_serializer(match).data)

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    # No auth required for now (we'll lock down later)
    permission_classes = [AllowAny]

class TeamPlayerViewSet(viewsets.ModelViewSet):
    queryset = TeamPlayer.objects.select_related('team','player').all()
    serializer_class = TeamPlayerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get('team')
        if team_id:
            try:
                qs = qs.filter(team_id=int(team_id))
            except (ValueError, TypeError):
                pass  # Invalid team_id, return all
        return qs

class UserView(APIView):
    """
    Get current user information with role
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserWithRoleSerializer(request.user)
        return Response(serializer.data)

class RegisterManagerView(APIView):
    """
    Register a new manager user
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not all([username, email, password]):
            return Response(
                {'detail': 'Username, email, and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'detail': 'Email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            # Set role_hint to manager
            from accounts.models import UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role_hint = 'manager'
            profile.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'detail': 'Manager account created successfully',
                'user': UserWithRoleSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'detail': f'Error creating manager: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )