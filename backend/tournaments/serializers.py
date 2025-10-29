# tournaments/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from .models import Venue, Tournament, Team, Registration, Match

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
    venue_id = serializers.IntegerField(write_only=True, required=True)
    organizer = UserSerializer(read_only=True)
    
    class Meta: 
        model = Tournament
        fields = "__all__"
        extra_kwargs = {
            'venue': {'required': False}
        }
    
    def create(self, validated_data):
        venue_id = validated_data.pop('venue_id')
        venue = Venue.objects.get(id=venue_id)
        validated_data['venue'] = venue
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        if 'venue_id' in validated_data:
            venue_id = validated_data.pop('venue_id')
            venue = Venue.objects.get(id=venue_id)
            validated_data['venue'] = venue
        return super().update(instance, validated_data)

class TeamSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Team
        fields = "__all__"

class RegistrationSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Registration
        fields = "__all__"

class MatchSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Match
        fields = "__all__"

class TeamInlineSerializer(serializers.ModelSerializer):
    """Serializer for team data when creating a registration"""
    class Meta:
        model = Team
        fields = ['name', 'manager_name', 'manager_email', 'phone']

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
        tournament_id = validated_data['tournament_id']
        team_data = validated_data['team']
        
        # Try to find existing team with same name and manager_email
        team, created = Team.objects.get_or_create(
            name=team_data['name'],
            manager_email=team_data['manager_email'],
            defaults={
                'manager_name': team_data['manager_name'],
                'phone': team_data.get('phone', '')
            }
        )
        
        # If team already exists, update manager_name and phone
        if not created:
            team.manager_name = team_data['manager_name']
            if 'phone' in team_data:
                team.phone = team_data['phone']
            team.save()
        
        # Create registration
        registration = Registration.objects.create(
            tournament_id=tournament_id,
            team=team,
            status='pending'
        )
        
        return registration
    
    def to_representation(self, instance):
        return {
            'registration_id': instance.id,
            'tournament_id': instance.tournament_id,
            'team_id': instance.team_id,
            'status': instance.status
        }
