"""
Permission guards for team and roster access.
Adapted from the ChatGPT prompt for Django REST Framework.
"""
from typing import Tuple, Optional
from django.contrib.auth.models import User
from .models import Team, Registration, Tournament


def assert_team_edit_access(user: Optional[User], team_id: int) -> Tuple[bool, Optional[str], Optional[Team], Optional[Tournament]]:
    """
    Check if user can edit team roster.
    
    Returns:
        (ok: bool, reason: Optional[str], team: Optional[Team], tournament: Optional[Tournament])
        
    Reasons:
        - 'UNAUTHENTICATED': User not logged in
        - 'UNPAID': Registration not paid yet
        - 'FORBIDDEN': User is not the team manager
        - 'NOT_FOUND': Team doesn't exist
    """
    if not user or not user.is_authenticated:
        return False, 'UNAUTHENTICATED', None, None
    
    try:
        team = Team.objects.select_related('manager_user').get(id=team_id)
    except Team.DoesNotExist:
        return False, 'NOT_FOUND', None, None
    
    # Check if user is the team manager
    if team.manager_user_id != user.id:
        return False, 'FORBIDDEN', None, None
    
    # Find the most recent registration for this team
    # In case of multiple tournaments, we'll check all and require at least one paid
    registrations = Registration.objects.filter(
        team=team,
        status__in=['pending', 'paid']
    ).select_related('tournament').order_by('-created_at')
    
    if not registrations.exists():
        return False, 'UNPAID', team, None
    
    # Check if any registration is paid
    paid_registration = registrations.filter(status='paid').first()
    if not paid_registration:
        # Has pending registration but not paid yet
        return False, 'UNPAID', team, registrations.first().tournament
    
    # User is manager and has paid registration - allow access
    return True, None, team, paid_registration.tournament


def get_registration_status(user: Optional[User], registration_id: int) -> dict:
    """
    Get registration status for polling endpoint.
    
    Returns:
        {
            'status': 'pending' | 'paid' | 'cancelled',
            'team_id': int,
            'tournament_id': int,
            'tournament_slug': Optional[str],
            'can_edit': bool,
            'reason': Optional[str]
        }
    """
    try:
        registration = Registration.objects.select_related('team', 'tournament').get(id=registration_id)
    except Registration.DoesNotExist:
        return {
            'status': None,
            'team_id': None,
            'tournament_id': None,
            'tournament_slug': None,
            'can_edit': False,
            'reason': 'NOT_FOUND'
        }
    
    # Check edit access
    can_edit = False
    reason = None
    if user and user.is_authenticated:
        ok, reason, _, _ = assert_team_edit_access(user, registration.team_id)
        can_edit = ok
    else:
        reason = 'UNAUTHENTICATED'
    
    return {
        'status': registration.status,
        'team_id': registration.team_id,
        'tournament_id': registration.tournament_id,
        'tournament_slug': None,  # Tournament model doesn't have slug, but we could add it
        'can_edit': can_edit,
        'reason': reason
    }

