# tournaments/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

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