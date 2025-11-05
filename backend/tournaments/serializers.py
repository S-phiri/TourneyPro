# tournaments/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from .models import Venue, Tournament, Team, Registration, Match, Player, TeamPlayer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id', 'username']

class VenueSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Venue
        fields = "__all__"

class TournamentSerializer(serializers.ModelSerializer):
    venue = VenueSerializer(read_only=True)
    venue_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    venue_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    venue_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    venue_map_link = serializers.URLField(write_only=True, required=False, allow_blank=True)
    organizer = UserSerializer(read_only=True)
    rules = serializers.JSONField(required=False, allow_null=True)
    structure = serializers.JSONField(required=False, allow_null=True)
    
    class Meta: 
        model = Tournament
        fields = "__all__"
        extra_kwargs = {
            'venue': {'required': False},
            'status': {'required': False},
            'venue_id': {'required': False}
        }
    
    def create(self, validated_data):
        venue_id = validated_data.pop('venue_id', None)
        venue_name = validated_data.pop('venue_name', None)
        venue_city = validated_data.get('city', '')
        venue_address = validated_data.pop('venue_address', '')
        venue_map_link = validated_data.pop('venue_map_link', '')
        
        if venue_id:
            venue = Venue.objects.get(id=venue_id)
            validated_data['venue'] = venue
        elif venue_name:
            # Create or get venue from wizard
            venue, _ = Venue.objects.get_or_create(
                name=venue_name,
                city=venue_city,
                defaults={
                    'address': venue_address,
                    'map_link': venue_map_link,
                }
            )
            validated_data['venue'] = venue
        # Allow creating without venue for drafts (will be set later)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Prevent format changes if tournament has started (has finished matches)
        if 'format' in validated_data:
            has_started = instance.matches.filter(status='finished').exists()
            if has_started:
                raise serializers.ValidationError({
                    'format': 'Tournament format cannot be changed after matches have been played.'
                })
        
        venue_id = validated_data.pop('venue_id', None)
        venue_name = validated_data.pop('venue_name', None)
        venue_city = validated_data.get('city', instance.city)
        venue_address = validated_data.pop('venue_address', None)
        venue_map_link = validated_data.pop('venue_map_link', None)
        
        if venue_id:
            venue = Venue.objects.get(id=venue_id)
            validated_data['venue'] = venue
        elif venue_name:
            # Create or get venue from wizard
            venue, _ = Venue.objects.get_or_create(
                name=venue_name,
                city=venue_city,
                defaults={
                    'address': venue_address or '',
                    'map_link': venue_map_link or '',
                }
            )
            # Update venue if it exists
            if venue.address != venue_address and venue_address:
                venue.address = venue_address
            if venue.map_link != venue_map_link and venue_map_link:
                venue.map_link = venue_map_link
            venue.save()
            validated_data['venue'] = venue
            
        return super().update(instance, validated_data)

class TeamSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    points = serializers.IntegerField(read_only=True)
    manager = UserSerializer(read_only=True, source='manager_user')
    manager_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Team
        fields = "__all__"

    def get_members(self, obj):
        qs = obj.memberships.select_related("player").all()
        return TeamPlayerSerializer(qs, many=True).data
    
    def create(self, validated_data):
        # Set manager_user from manager_id if provided, otherwise use request.user if authenticated
        manager_id = validated_data.pop('manager_id', None)
        request = self.context.get('request')
        if manager_id:
            validated_data['manager_user_id'] = manager_id
        elif request and request.user.is_authenticated:
            validated_data['manager_user_id'] = request.user.id
        return super().create(validated_data)

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = "__all__"

class TeamPlayerSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    player_id = serializers.PrimaryKeyRelatedField(queryset=Player.objects.all(), write_only=True, source='player')

    class Meta:
        model = TeamPlayer
        fields = ['id', 'team', 'player', 'player_id', 'number', 'is_captain']

class RegistrationSerializer(serializers.ModelSerializer):
    # Nest the TeamSerializer to display full team details including name
    team = TeamSerializer(read_only=True)
    tournament = TournamentSerializer(read_only=True)
    
    class Meta: 
        model = Registration
        fields = "__all__"

class MatchSerializer(serializers.ModelSerializer):
    # Nest team serializers to include full team details
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    tournament = TournamentSerializer(read_only=True)
    
    class Meta: 
        model = Match
        fields = "__all__"

class TeamInlineSerializer(serializers.Serializer):
    """Serializer for team data when creating a registration"""
    name = serializers.CharField(max_length=160)
    manager_name = serializers.CharField(max_length=160)
    manager_email = serializers.EmailField()
    manager_password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)

class RegistrationCreateSerializer(serializers.Serializer):
    """Serializer for creating a registration with team data"""
    tournament_id = serializers.IntegerField(required=True)
    team = TeamInlineSerializer()
    note = serializers.CharField(required=False, allow_blank=True, default='')
    
    def validate_tournament_id(self, value):
        try:
            tournament = Tournament.objects.get(id=value)
        except Tournament.DoesNotExist:
            raise serializers.ValidationError("Tournament does not exist.")
        
        # Check if tournament is open
        if tournament.status != 'open':
            raise serializers.ValidationError("Registration is closed for this tournament.")
        
        # Check registration deadline
        if tournament.registration_deadline:
            if timezone.now().date() > tournament.registration_deadline:
                raise serializers.ValidationError("Registration deadline has passed.")
        
        return value
    
    def validate(self, attrs):
        tournament_id = attrs['tournament_id']
        manager_email = attrs['team']['manager_email']
        
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            raise serializers.ValidationError("Tournament does not exist.")
        
        # Check capacity
        current_registrations = Registration.objects.filter(tournament_id=tournament_id).count()
        if current_registrations >= tournament.team_max:
            raise serializers.ValidationError("Tournament is full.")
        
        # Check if email is already registered for this tournament
        existing_registration = Registration.objects.filter(
            tournament_id=tournament_id,
            team__manager_email=manager_email
        ).exists()
        
        if existing_registration:
            raise serializers.ValidationError("A team with this email is already registered for this tournament.")
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        from rest_framework_simplejwt.tokens import RefreshToken
        from accounts.models import UserProfile
        
        tournament_id = validated_data['tournament_id']
        team_data = validated_data['team']
        request = self.context.get('request')
        
        manager_email = team_data['manager_email']
        manager_name = team_data['manager_name']
        
        # Prepare team defaults
        team_defaults = {
            'manager_name': manager_name,
            'phone': team_data.get('phone', '')
        }
        
        manager_user = None
        tokens = None
        user_created = False
        
        manager_password = team_data.get('manager_password', '').strip()
        
        # If user is authenticated, use their account
        if request and request.user.is_authenticated:
            manager_user = request.user
            team_defaults['manager_user'] = manager_user
        else:
            # User is not authenticated - create or find user account
            # Try to find existing user by email
            try:
                manager_user = User.objects.get(email=manager_email)
                # If user exists but password was provided, verify it matches
                # Otherwise, user already has an account
            except User.DoesNotExist:
                # Password is required for new users
                if not manager_password:
                    raise serializers.ValidationError({
                        'team': {'manager_password': 'Password is required for new accounts'}
                    })
                
                # Create new user account
                username = manager_email.split('@')[0]  # Use email prefix as username
                # Ensure username is unique
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                # Create user with provided password
                manager_user = User.objects.create_user(
                    username=username,
                    email=manager_email,
                    password=manager_password,
                    first_name=manager_name.split()[0] if manager_name.split() else '',
                    last_name=' '.join(manager_name.split()[1:]) if len(manager_name.split()) > 1 else ''
                )
                
                # Create user profile with manager role
                profile, _ = UserProfile.objects.get_or_create(user=manager_user)
                profile.role_hint = 'manager'
                profile.save()
                
                user_created = True
                
                # Generate tokens for the new user
                refresh = RefreshToken.for_user(manager_user)
                tokens = {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            
            team_defaults['manager_user'] = manager_user
        
        # Try to find existing team with same name and manager_email
        team, created = Team.objects.get_or_create(
            name=team_data['name'],
            manager_email=manager_email,
            defaults=team_defaults
        )
        
        # Always update manager_user to the current user if they're registering
        # This ensures the person registering becomes the manager
        if not created:
            # If team exists, update it
            team.manager_name = team_data['manager_name']
            if 'phone' in team_data:
                team.phone = team_data['phone']
            # Update manager_user if not already set, or if it's the registering user
            if not team.manager_user or (manager_user and team.manager_user_id != manager_user.id):
                team.manager_user = manager_user
            team.save()
        
        # Create registration
        registration = Registration.objects.create(
            tournament_id=tournament_id,
            team=team,
            status='pending'
        )
        
        # Store tokens and user_created flag in registration for response
        registration._tokens = tokens
        registration._user_created = user_created
        
        return registration
    
    def to_representation(self, instance):
        result = {
            'registration_id': instance.id,
            'tournament_id': instance.tournament_id,
            'team_id': instance.team_id,
            'status': instance.status
        }
        
        # Include tokens if a new user was created
        if hasattr(instance, '_tokens') and instance._tokens:
            result['tokens'] = instance._tokens
            result['user_created'] = getattr(instance, '_user_created', False)
        
        return result
