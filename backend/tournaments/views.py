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
from .models import Venue, Tournament, Team, Registration, Match, Player, TeamPlayer, MatchScorer, MatchAssist, Referee, MatchReferee
from .serializers import VenueSerializer, TournamentSerializer, TeamSerializer, RegistrationSerializer, MatchSerializer, UserSerializer, RegistrationCreateSerializer, PlayerSerializer, TeamPlayerSerializer
from .permissions import IsOrganizerOrReadOnly, IsOrganizerOfRelatedTournamentOrReadOnly, IsTeamManagerOrHost, IsTournamentOrganiser, IsTeamManagerOrReadOnly, IsMatchRefereeOrOrganizer
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
    lookup_field = 'pk'  # Default lookup by ID
    
    def get_permissions(self):
        """Apply different permissions based on action"""
        # Public endpoints (no auth required)
        public_actions = ['list', 'retrieve', 'register', 'standings', 'top_scorers', 'top_assists', 'role']
        # Handle both underscore and hyphen formats for action names
        action_name = self.action.replace('-', '_') if self.action else None
        
        if self.action in public_actions or action_name in public_actions:
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
        from .tournament_formats import generate_groups, calculate_group_standings
        
        tournament = self.get_object()
        teams = list(Team.objects.filter(registrations__tournament=tournament, registrations__status__in=['pending', 'paid']).distinct())
        matches = Match.objects.filter(tournament=tournament, status='finished')
        
        # NEW: Handle combinationB format (Groups → Knockout) with group standings
        structure = tournament.structure or {}
        combination_type = structure.get('combination_type', 'combinationA')
        
        if tournament.format == 'combination' and combination_type == 'combinationB':
            # Return group-based standings
            groups = generate_groups(teams, 'combinationB')
            group_standings = {}
            
            for group in groups:
                group_name = group['name']
                group_teams = group['teams']
                standings_list = calculate_group_standings(group_teams, matches, group_name)
                
                # Convert to serialized format
                group_standings[group_name] = [
                    {
                        'team': TeamSerializer(stand['team']).data,
                        'played': stand['played'],
                        'won': stand['wins'],
                        'drawn': stand['draws'],
                        'lost': stand['losses'],
                        'points': stand['points'],
                        'goals_for': stand['goals_for'],
                        'goals_against': stand['goals_against'],
                        'goal_difference': stand['goal_difference'],
                        'position': idx + 1
                    }
                    for idx, stand in enumerate(standings_list)
                ]
            
            return Response({
                'format': 'groups',
                'groups': group_standings
            })
        
        # Regular standings (league or combinationA)
        standings = []
        for team in teams:
            # Get matches for this team in this tournament
            team_matches = matches.filter(
                models.Q(home_team=team) | models.Q(away_team=team)
            )
            
            played = team_matches.count()
            wins = 0
            draws = 0
            losses = 0
            goals_for = 0
            goals_against = 0
            
            for match in team_matches:
                if match.home_team == team:
                    gf = match.home_score or 0
                    ga = match.away_score or 0
                else:
                    gf = match.away_score or 0
                    ga = match.home_score or 0
                
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
        
        return Response({
            'format': 'league',
            'standings': standings
        })
    
    @action(detail=True, methods=['get'], url_path='top-scorers', permission_classes=[AllowAny])
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
    
    @action(detail=True, methods=['get'], url_path='top-assists', permission_classes=[AllowAny])
    def top_assists(self, request, pk=None):
        """NEW: Get top assists for the tournament (public endpoint)"""
        tournament = self.get_object()
        # Get all teams in this tournament
        team_ids = Team.objects.filter(
            registrations__tournament=tournament,
            registrations__status__in=['pending', 'paid']
        ).values_list('id', flat=True)
        
        # Get players from those teams with assists
        players = Player.objects.filter(
            memberships__team_id__in=team_ids,
            assists__gt=0
        ).order_by('-assists', '-goals', 'first_name', 'last_name')[:10]
        
        assisters = []
        for player in players:
            # Get team name for this player
            team_membership = TeamPlayer.objects.filter(
                player=player,
                team_id__in=team_ids
            ).select_related('team').first()
            
            team_name = team_membership.team.name if team_membership else 'Unknown'
            
            assisters.append({
                'name': f"{player.first_name} {player.last_name}".strip(),
                'team': team_name,
                'assists': player.assists or 0,
                'goals': player.goals or 0  # Include goals for tiebreaking display
            })
        
        return Response(assisters)
    
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
        from django.db import transaction
        from .tournament_formats import generate_fixtures_for_tournament
        
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organiser can generate fixtures'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if fixtures already exist
        existing_matches = Match.objects.filter(tournament=tournament).count()
        if existing_matches > 0:
            return Response(
                {'detail': 'Fixtures already exist. Delete existing matches first to regenerate.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # NEW: Generate fixtures based on tournament format
        try:
            with transaction.atomic():
                matches = generate_fixtures_for_tournament(tournament)
                
                # Save matches to database
                created_matches = []
                for match in matches:
                    match.save()
                    created_matches.append(match)
                
                return Response({
                    'detail': f'Successfully generated {len(created_matches)} fixtures',
                    'tournament_id': tournament.id,
                    'format': tournament.format,
                    'matches_created': len(created_matches)
                }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'Error generating fixtures: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='seed-test-teams', permission_classes=[IsAuthenticated, IsTournamentOrganiser])
    def seed_test_teams(self, request, pk=None):
        """Seed test teams for tournament (organiser only)"""
        from .seed_helpers import seed_test_teams as seed_teams_helper
        
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organiser can seed test teams'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get parameters from request
        num_teams = int(request.data.get('teams', 8))
        mark_paid = request.data.get('paid', False) == True
        players_per_team = int(request.data.get('players', 0))
        simulate_games = request.data.get('simulate_games', False) == True  # Default to False
        
        # Validate
        # Allow num_teams = 0 to add players to existing teams, but require >= 1 for creating new teams
        if num_teams < 0:
            return Response(
                {'detail': 'Number of teams cannot be negative'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only validate team capacity if we're actually creating new teams
        if num_teams > 0 and num_teams > tournament.team_max:
            return Response(
                {'detail': f'Number of teams cannot exceed tournament capacity ({tournament.team_max})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            result = seed_teams_helper(
                tournament=tournament,
                num_teams=num_teams,
                mark_paid=mark_paid,
                players_per_team=players_per_team,
                simulate_games=simulate_games
            )
            
            if 'error' in result:
                return Response(
                    {'detail': result['error']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'Error seeding teams: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='simulate-round', permission_classes=[IsAuthenticated, IsTournamentOrganiser])
    def simulate_round(self, request, pk=None):
        """Simulate one round of matches for tournament (organiser only)"""
        from .simulation_helpers import simulate_round as simulate_round_helper
        
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organiser can simulate rounds'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            result = simulate_round_helper(tournament)
            
            if 'error' in result:
                return Response(
                    {'detail': result['error']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'Error simulating round: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='clear-fixtures', permission_classes=[IsAuthenticated, IsTournamentOrganiser])
    def clear_fixtures(self, request, pk=None):
        """Delete all matches/fixtures for tournament (organiser only)"""
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organiser can clear fixtures'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Count matches before deletion
        match_count = Match.objects.filter(tournament=tournament).count()
        
        # Delete all matches (MatchScorer and MatchAssist will be deleted via CASCADE)
        deleted_count = Match.objects.filter(tournament=tournament).delete()[0]
        
        return Response({
            'detail': f'Successfully deleted {deleted_count} matches',
            'matches_deleted': deleted_count,
            'tournament_id': tournament.id
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='referee-login', permission_classes=[AllowAny])
    def referee_login(self, request):
        """Referee login using username and passcode"""
        username = request.data.get('username')
        passcode = request.data.get('passcode')
        
        if not username or not passcode:
            return Response(
                {'detail': 'Username and passcode are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            referee = Referee.objects.get(username=username, is_active=True)
            if referee.passcode == passcode:  # Simple passcode check (can be hashed later)
                # Return referee info and assigned matches
                matches = Match.objects.filter(
                    assigned_referees__referee=referee,
                    status__in=['scheduled', 'live']
                ).select_related('home_team', 'away_team', 'tournament').order_by('kickoff_at')
                
                from .serializers import MatchSerializer
                return Response({
                    'referee_id': referee.id,
                    'name': referee.name,
                    'username': referee.username,
                    'assigned_matches': MatchSerializer(matches, many=True).data
                })
            else:
                return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        except Referee.DoesNotExist:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['get'], url_path='by-slug/(?P<slug>[^/.]+)', permission_classes=[AllowAny])
    def by_slug(self, request, slug=None):
        """NEW: Get tournament by slug (public endpoint)"""
        try:
            tournament = Tournament.objects.get(slug=slug)
            serializer = self.get_serializer(tournament)
            return Response(serializer.data)
        except Tournament.DoesNotExist:
            return Response(
                {'detail': 'Tournament not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
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
    
    @action(detail=True, methods=['post'], url_path='mark-paid', permission_classes=[IsAuthenticated, IsOrganizerOfRelatedTournamentOrReadOnly])
    def mark_paid(self, request, pk=None):
        """NEW: Mark registration as paid (organizer only)"""
        registration = self.get_object()
        
        # Check if user is organizer of this tournament
        if not request.user.is_authenticated or registration.tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organizer can mark registrations as paid'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update status to paid
        registration.status = 'paid'
        registration.paid_amount = registration.tournament.entry_fee
        registration.save()
        
        # NEW: Send payment confirmation email to manager
        try:
            from .emails import send_payment_confirmation
            send_payment_confirmation(registration)
        except Exception as e:
            # Don't fail the request if email fails
            print(f"Failed to send payment confirmation email: {e}")
        
        return Response({
            'detail': 'Registration marked as paid',
            'registration_id': registration.id,
            'status': registration.status,
            'paid_amount': str(registration.paid_amount)
        })

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.select_related("tournament","home_team","away_team").prefetch_related("scorers__player", "scorers__assist__player", "assists__player").all()
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

    @action(detail=True, methods=['post'], url_path='start', permission_classes=[IsMatchRefereeOrOrganizer])
    def start_match(self, request, pk=None):
        """Start match - set status to live and record start time"""
        from django.utils import timezone
        
        match = self.get_object()
        
        # Check if match is already started or finished
        if match.status == 'live':
            return Response(
                {'detail': 'Match is already live'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if match.status == 'finished':
            return Response(
                {'detail': 'Match is already finished'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions: organizer or assigned referee
        tournament = match.tournament
        is_organizer = tournament.organizer_id == request.user.id if request.user.is_authenticated else False
        
        # Check if referee_id is provided (for referee login)
        referee_id = request.data.get('referee_id')
        is_referee = False
        if referee_id:
            try:
                from .models import Referee
                referee = Referee.objects.get(id=referee_id, is_active=True)
                is_referee = MatchReferee.objects.filter(match=match, referee=referee, is_primary=True).exists()
            except:
                pass
        
        if not (is_organizer or is_referee):
            return Response(
                {'detail': 'Only organizer or assigned referee can start a match'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Start the match
        match.status = 'live'
        match.started_at = timezone.now()
        # Get duration from tournament rules
        duration = tournament.rules.get('duration_mins', 20) if tournament.rules else 20
        match.duration_minutes = duration
        match.save()
        
        return Response({
            'detail': 'Match started',
            'started_at': match.started_at,
            'duration_minutes': match.duration_minutes,
            'status': match.status
        })

    @action(detail=True, methods=['post'], url_path='end', permission_classes=[IsMatchRefereeOrOrganizer])
    def end_match(self, request, pk=None):
        """End match - set status to finished"""
        from .simulation_helpers import generate_next_knockout_round
        
        match = self.get_object()
        
        # Check if match is already finished
        if match.status == 'finished':
            return Response(
                {'detail': 'Match is already finished'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions: organizer or assigned referee
        tournament = match.tournament
        is_organizer = tournament.organizer_id == request.user.id if request.user.is_authenticated else False
        
        # Check if referee_id is provided (for referee login)
        referee_id = request.data.get('referee_id')
        is_referee = False
        if referee_id:
            try:
                from .models import Referee
                referee = Referee.objects.get(id=referee_id, is_active=True)
                is_referee = MatchReferee.objects.filter(match=match, referee=referee, is_primary=True).exists()
            except:
                pass
        
        if not (is_organizer or is_referee):
            return Response(
                {'detail': 'Only organizer or assigned referee can end a match'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # End the match
        match.status = 'finished'
        match.save()
        
        # Auto-generate next knockout round if applicable
        if tournament.format == 'knockout' and match.pitch:
            # Extract round number from pitch
            import re
            round_match = re.search(r'Round\s+(\d+)', match.pitch, re.IGNORECASE)
            if round_match:
                completed_round = int(round_match.group(1))
                try:
                    generate_next_knockout_round(tournament, completed_round)
                except:
                    pass  # Don't fail if next round generation fails
        
        return Response({
            'detail': 'Match ended',
            'status': match.status
        })

    @action(detail=True, methods=['post'], url_path='score', permission_classes=[IsMatchRefereeOrOrganizer])
    def set_score(self, request, pk=None):
        from django.db import transaction
        # MatchScorer and MatchAssist already imported at top of file
        
        match = self.get_object()
        try:
            hs = int(request.data.get('home_score', 0))
            as_ = int(request.data.get('away_score', 0))
            # NEW: Support assists - arrays of player IDs (one per goal)
            home_scorers = request.data.get('home_scorers', [])  # List of player IDs (one per goal)
            away_scorers = request.data.get('away_scorers', [])  # List of player IDs (one per goal)
            home_assists = request.data.get('home_assists', [])  # NEW: List of assister IDs or null (one per goal)
            away_assists = request.data.get('away_assists', [])  # NEW: List of assister IDs or null (one per goal)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid score'}, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Clear existing scorers and assists for this match
            MatchAssist.objects.filter(match=match).delete()  # NEW: Delete assists first (due to FK)
            MatchScorer.objects.filter(match=match).delete()
            
            # Update match score
            match.home_score = max(0, hs)
            match.away_score = max(0, as_)
            match.status = 'finished'
            match.save()
            
            # Track player stats updates (to avoid double-counting)
            player_goal_updates = {}
            player_assist_updates = {}
            player_appearance_updates = set()
            
            # NEW: Process home goals with assists
            for idx, scorer_id in enumerate(home_scorers):
                try:
                    scorer_id = int(scorer_id)
                    assister_id = home_assists[idx] if idx < len(home_assists) else None
                    if assister_id is not None:
                        try:
                            assister_id = int(assister_id)
                        except (ValueError, TypeError):
                            assister_id = None
                    
                    scorer = Player.objects.get(id=scorer_id)
                    # Verify scorer is on home team
                    if TeamPlayer.objects.filter(team=match.home_team, player=scorer).exists():
                        # Create goal record
                        goal = MatchScorer.objects.create(
                            match=match,
                            player=scorer,
                            team=match.home_team
                        )
                        
                        # Track goal for stats update
                        player_goal_updates[scorer_id] = player_goal_updates.get(scorer_id, 0) + 1
                        player_appearance_updates.add(scorer_id)
                        
                        # NEW: Create assist record if assister specified
                        if assister_id:
                            try:
                                assister = Player.objects.get(id=assister_id)
                                # Verify assister is on same team
                                if TeamPlayer.objects.filter(team=match.home_team, player=assister).exists():
                                    MatchAssist.objects.create(
                                        goal=goal,
                                        match=match,
                                        player=assister,
                                        team=match.home_team
                                    )
                                    # Track assist for stats update
                                    player_assist_updates[assister_id] = player_assist_updates.get(assister_id, 0) + 1
                                    player_appearance_updates.add(assister_id)
                            except Player.DoesNotExist:
                                pass
                except (ValueError, TypeError, Player.DoesNotExist):
                    continue
            
            # NEW: Process away goals with assists
            for idx, scorer_id in enumerate(away_scorers):
                try:
                    scorer_id = int(scorer_id)
                    assister_id = away_assists[idx] if idx < len(away_assists) else None
                    if assister_id is not None:
                        try:
                            assister_id = int(assister_id)
                        except (ValueError, TypeError):
                            assister_id = None
                    
                    scorer = Player.objects.get(id=scorer_id)
                    # Verify scorer is on away team
                    if TeamPlayer.objects.filter(team=match.away_team, player=scorer).exists():
                        # Create goal record
                        goal = MatchScorer.objects.create(
                            match=match,
                            player=scorer,
                            team=match.away_team
                        )
                        
                        # Track goal for stats update
                        player_goal_updates[scorer_id] = player_goal_updates.get(scorer_id, 0) + 1
                        player_appearance_updates.add(scorer_id)
                        
                        # NEW: Create assist record if assister specified
                        if assister_id:
                            try:
                                assister = Player.objects.get(id=assister_id)
                                # Verify assister is on same team
                                if TeamPlayer.objects.filter(team=match.away_team, player=assister).exists():
                                    MatchAssist.objects.create(
                                        goal=goal,
                                        match=match,
                                        player=assister,
                                        team=match.away_team
                                    )
                                    # Track assist for stats update
                                    player_assist_updates[assister_id] = player_assist_updates.get(assister_id, 0) + 1
                                    player_appearance_updates.add(assister_id)
                            except Player.DoesNotExist:
                                pass
                except (ValueError, TypeError, Player.DoesNotExist):
                    continue
            
            # Update player stats (goals, assists, appearances)
            for player_id, goal_count in player_goal_updates.items():
                try:
                    player = Player.objects.get(id=player_id)
                    player.goals = (player.goals or 0) + goal_count
                    player.save()
                except Player.DoesNotExist:
                    continue
            
            for player_id, assist_count in player_assist_updates.items():
                try:
                    player = Player.objects.get(id=player_id)
                    player.assists = (player.assists or 0) + assist_count
                    player.save()
                except Player.DoesNotExist:
                    continue
            
            # Update appearances for all players who played (scorers and assisters already counted)
            # For other players, we'd need match lineups - for now, only update scorers/assisters
            for player_id in player_appearance_updates:
                try:
                    player = Player.objects.get(id=player_id)
                    player.appearances = (player.appearances or 0) + 1
                    player.save()
                except Player.DoesNotExist:
                    continue
        
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