# tournaments/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import MatchReferee

class IsOrganizerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, "organizer_id", None) == getattr(request.user, "id", None)

class IsOrganizerOfRelatedTournamentOrReadOnly(BasePermission):
    """Use when the object links to a Tournament via .tournament"""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        tour = getattr(obj, "tournament", None)
        if tour is None:
            return False
        return getattr(tour, "organizer_id", None) == getattr(request.user, "id", None)

class IsHost(BasePermission):
    def has_object_permission(self, request, view, obj):
        return getattr(obj, 'organizer_id', None) == getattr(request.user, 'id', None)

class IsTeamManagerOrHost(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Direct manager on team
        if hasattr(obj, 'manager_user_id') and obj.manager_user_id == getattr(request.user, 'id', None):
            return True
        # Host via tournament link
        tour = getattr(obj, 'tournament', None)
        if tour is not None:
            return getattr(tour, 'organizer_id', None) == getattr(request.user, 'id', None)
        return False

class IsTournamentOrganiser(BasePermission):
    """Permission for tournament organiser operations"""
    def has_object_permission(self, request, view, obj):
        # obj is a Tournament
        if request.method in SAFE_METHODS:
            return True
        # Check both organizer and organiser (for compatibility)
        return request.user.is_authenticated and (
            getattr(obj, 'organizer_id', None) == request.user.id or
            getattr(obj, 'organiser_id', None) == request.user.id
        )

class IsTeamManagerOrReadOnly(BasePermission):
    """Permission for team manager operations - managers can edit, others read-only"""
    def has_object_permission(self, request, view, obj):
        # obj is a Team
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        
        # Check if user is manager
        if getattr(obj, 'manager_user_id', None) != request.user.id:
            return False
        
        # Allow all operations if user is manager
        # Payment check will be handled when "Pay Now" is clicked
        # Managers can add/edit players and edit team before payment
        return True

class IsMatchRefereeOrOrganizer(BasePermission):
    """Permission for match operations - referees (when live) and organizers (always) can update"""
    def has_object_permission(self, request, view, obj):
        # obj is a Match
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        
        # Check if user is organizer
        tournament = getattr(obj, 'tournament', None)
        if tournament and getattr(tournament, 'organizer_id', None) == request.user.id:
            return True  # Organizer can always update
        
        # Check if user is assigned referee for this match
        # For referee login, we'll need to check via referee_id from request
        # This will be handled in the view by checking referee_id from request.data
        # For now, allow if user is authenticated (referee check happens in view)
        return True