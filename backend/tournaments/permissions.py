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
