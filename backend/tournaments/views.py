# tournaments/views.py
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Venue, Tournament, Team, Registration, Match
from .serializers import VenueSerializer, TournamentSerializer, TeamSerializer, RegistrationSerializer, MatchSerializer, UserSerializer, RegistrationCreateSerializer
from .permissions import IsOrganizerOrReadOnly, IsOrganizerOfRelatedTournamentOrReadOnly

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
    permission_classes = [IsAuthenticatedOrReadOnly, IsOrganizerOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)
    
    @action(detail=False, methods=['get'])
    def mine(self, request):
        """Get tournaments organized by the current user"""
        tournaments = self.queryset.filter(organizer=request.user)
        serializer = self.get_serializer(tournaments, many=True)
        return Response(serializer.data)
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve', 'register']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated, IsOrganizerOrReadOnly]
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['post'], url_path='register')
    def register(self, request):
        """
        Register a team for this tournament.
        Accepts team data and creates a new registration.
        """
        tournament = self.get_object()
        
        # Prepare data with tournament_id from URL
        data = request.data.copy()
        data['tournament_id'] = tournament.id
        
        serializer = RegistrationCreateSerializer(data=data)
        if serializer.is_valid():
            registration = serializer.save()
            
            return Response(
                {
                    'registration_id': registration.id,
                    'tournament_id': registration.tournament_id,
                    'team_id': registration.team_id,
                    'status': registration.status
                },
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [AllowAny]  # Allow public team registration

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

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.select_related("tournament","home_team","away_team").all()
    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOrganizerOfRelatedTournamentOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        tid = self.request.query_params.get("tournament")
        return qs.filter(tournament_id=tid) if tid else qs

class UserView(APIView):
    """
    Get current user information
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)