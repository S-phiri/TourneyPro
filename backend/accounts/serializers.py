from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role_hint']

class UserWithRoleSerializer(serializers.ModelSerializer):
    role_hint = serializers.CharField(source='profile.role_hint', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role_hint', 'is_staff']

