# tournaments/views.py
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import models
from django.db.models import Q
from .models import Venue, Tournament, Team, Registration, Match, Player, TeamPlayer, MatchScorer, MatchAssist, Referee, MatchReferee
from .serializers import VenueSerializer, TournamentSerializer, TeamSerializer, RegistrationSerializer, MatchSerializer, UserSerializer, RegistrationCreateSerializer, PlayerSerializer, TeamPlayerSerializer
from .permissions import IsOrganizerOrReadOnly, IsOrganizerOfRelatedTournamentOrReadOnly, IsTeamManagerOrHost, IsTournamentOrganiser, IsTeamManagerOrReadOnly, IsMatchRefereeOrOrganizer, IsOrganiser
from accounts.serializers import UserWithRoleSerializer


class RestrictedTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT login view that restricts access to only Benson.
    """
    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')
        
        # Only allow Benson to login
        if username != 'Benson':
            return Response(
                {'detail': 'Access restricted. Only authorised users can login.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user exists and is active
        try:
            user = User.objects.get(username=username)
            if not user.is_active:
                return Response(
                    {'detail': 'Account is inactive.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Proceed with normal JWT token generation
        return super().post(request, *args, **kwargs)

class RegisterView(APIView):
    """
    User registration endpoint - DISABLED in single organiser mode
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        return Response(
            {'detail': 'Registration is disabled. Please contact the organiser.'}, 
            status=status.HTTP_403_FORBIDDEN
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
        public_actions = ['list', 'retrieve', 'standings', 'top_scorers', 'top_assists', 'role', 'by_slug']
        # Handle both underscore and hyphen formats for action names
        action_name = self.action.replace('-', '_') if self.action else None
        
        if self.action in public_actions or action_name in public_actions:
            permission_classes = [AllowAny]
        elif self.action in ['update', 'partial_update', 'destroy', 'generate_fixtures', 'publish', 'register']:
            permission_classes = [IsAuthenticated, IsOrganiser]
        elif self.action == 'create':
            permission_classes = [IsAuthenticated, IsOrganiser]  # Only organiser can create
        elif self.action in ['seed_test_teams', 'simulate_round', 'clear_fixtures', 'reset_tournament', 'reset_matches', 'remove_last_team', 'debug_knockout', 'validate_fixtures', 'generate_knockouts']:
            permission_classes = [IsAuthenticated, IsOrganiser]
        else:
            permission_classes = [IsAuthenticated, IsOrganiser]
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
    
    @action(detail=True, methods=['get'], url_path='awards', permission_classes=[AllowAny])
    def awards(self, request, pk=None):
        """Get tournament awards: Top Scorer, Top Assister, Clean Sheets Leader, MVP, Winners"""
        tournament = self.get_object()
        from .awards import get_top_scorer, get_mvp, get_tournament_winner, get_tournament_runner_up, get_tournament_third_place, get_clean_sheets_leader
        
        # Get top assister (player with most assists)
        top_assister = None
        team_ids = Team.objects.filter(
            registrations__tournament=tournament,
            registrations__status__in=['pending', 'paid']
        ).values_list('id', flat=True)
        
        top_assister_player = Player.objects.filter(
            memberships__team_id__in=team_ids,
            assists__gt=0
        ).order_by('-assists', '-goals').first()
        
        if top_assister_player:
            team_player = TeamPlayer.objects.filter(
                player=top_assister_player,
                team_id__in=team_ids
            ).select_related('team').first()
            
            top_assister = {
                'player': {
                    'id': top_assister_player.id,
                    'first_name': top_assister_player.first_name,
                    'last_name': top_assister_player.last_name,
                    'full_name': f"{top_assister_player.first_name} {top_assister_player.last_name}".strip()
                },
                'team': {
                    'id': team_player.team.id if team_player else None,
                    'name': team_player.team.name if team_player else 'Unknown'
                } if team_player else None,
                'assists': top_assister_player.assists or 0
            }
        
        return Response({
            'top_scorer': get_top_scorer(tournament),
            'top_assister': top_assister,
            'clean_sheets_leader': get_clean_sheets_leader(tournament),
            'mvp': get_mvp(tournament),
            'winner': get_tournament_winner(tournament),
            'runner_up': get_tournament_runner_up(tournament),
            'third_place': get_tournament_third_place(tournament)
        })
    
    @action(detail=True, methods=['get'], url_path='players-for-mvp', permission_classes=[IsAuthenticated, IsOrganiser])
    def players_for_mvp(self, request, pk=None):
        """Get all players in tournament for MVP selection (organiser only)"""
        tournament = self.get_object()
        
        # Get all teams in tournament
        team_ids = Team.objects.filter(
            registrations__tournament=tournament,
            registrations__status__in=['pending', 'paid']
        ).values_list('id', flat=True)
        
        # Get all players in those teams with their stats
        players_data = []
        matches = Match.objects.filter(tournament=tournament, status='finished')
        
        for team_id in team_ids:
            team_players = TeamPlayer.objects.filter(team_id=team_id).select_related('player', 'team')
            for tp in team_players:
                player = tp.player
                goals = MatchScorer.objects.filter(match__in=matches, player=player).count()
                assists = MatchAssist.objects.filter(match__in=matches, player=player).count()
                appearances = player.appearances or 0
                
                players_data.append({
                    'id': player.id,
                    'first_name': player.first_name,
                    'last_name': player.last_name,
                    'full_name': f"{player.first_name} {player.last_name}".strip(),
                    'team_id': tp.team.id,
                    'team_name': tp.team.name,
                    'goals': goals,
                    'assists': assists,
                    'appearances': appearances,
                    'mvp_score': goals + assists
                })
        
        # Sort by MVP score (goals + assists), then goals
        players_data.sort(key=lambda x: (-x['mvp_score'], -x['goals']))
        
        return Response({'players': players_data})
    
    @action(detail=True, methods=['post'], url_path='set-mvp', permission_classes=[IsAuthenticated, IsOrganiser])
    def set_mvp(self, request, pk=None):
        """Set the MVP player for tournament (organiser only)"""
        from .awards import get_mvp
        tournament = self.get_object()
        player_id = request.data.get('player_id')
        
        if not player_id:
            return Response({'detail': 'player_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify player is in tournament
        team_ids = Team.objects.filter(
            registrations__tournament=tournament,
            registrations__status__in=['pending', 'paid']
        ).values_list('id', flat=True)
        
        team_player = TeamPlayer.objects.filter(
            player_id=player_id,
            team_id__in=team_ids
        ).first()
        
        if not team_player:
            return Response({'detail': 'Player is not in this tournament'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Store MVP in tournament structure
        structure = tournament.structure or {}
        structure['selected_mvp_player_id'] = player_id
        tournament.structure = structure
        tournament.save(update_fields=['structure'])
        
        return Response({
            'detail': 'MVP selected successfully',
            'mvp': get_mvp(tournament)
        })
    
    @action(detail=True, methods=['get'], url_path='standings')
    def standings(self, request, pk=None):
        """Get tournament standings calculated from matches"""
        from .tournament_formats import generate_groups, calculate_group_standings
        
        tournament = self.get_object()
        teams = list(Team.objects.filter(registrations__tournament=tournament, registrations__status__in=['pending', 'paid']).distinct())
        matches = list(Match.objects.filter(tournament=tournament, status='finished'))
        
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
            team_matches = [m for m in matches if m.home_team == team or m.away_team == team]
            
            played = len(team_matches)
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
                
                # Validate fixture completeness after generation and FIX immediately if incomplete
                validation_warnings = []
                matches_regenerated = 0
                if tournament.format == 'combination':
                    structure = tournament.structure or {}
                    combination_type = structure.get('combination_type', 'combinationA')
                    if combination_type == 'combinationB':
                        from .tournament_formats import generate_groups, validate_round_robin_completeness, generate_round_robin_for_group
                        from datetime import datetime
                        
                        groups = generate_groups(list(Team.objects.filter(
                            registrations__tournament=tournament,
                            registrations__status__in=['pending', 'paid']
                        ).distinct()), 'combinationB')
                        
                        # Re-fetch matches after generation
                        all_existing_matches = list(Match.objects.filter(tournament=tournament))
                        
                        for group in groups:
                            group_name = group['name']
                            group_teams = group['teams']
                            validation_result = validate_round_robin_completeness(group_teams, all_existing_matches, group_name)
                            
                            if not validation_result.get('valid', False):
                                # DELETE ALL matches for this group and regenerate from scratch
                                deleted_count = Match.objects.filter(
                                    tournament=tournament,
                                    pitch__startswith=group_name
                                ).count()
                                Match.objects.filter(
                                    tournament=tournament,
                                    pitch__startswith=group_name
                                ).delete()
                                
                                # Regenerate all matches for this group
                                start_date = datetime.now()
                                group_matches = generate_round_robin_for_group(
                                    group_teams,
                                    tournament,
                                    group_name,
                                    start_date,
                                    start_round=1
                                )
                                
                                # Save new matches
                                for round_num, match_obj in group_matches:
                                    match_obj.save()
                                    created_matches.append(match_obj)
                                    matches_regenerated += 1
                                
                                # Update all_existing_matches list
                                all_existing_matches = list(Match.objects.filter(tournament=tournament))
                                
                                # Re-validate
                                validation_result = validate_round_robin_completeness(group_teams, all_existing_matches, group_name)
                                if not validation_result.get('valid', False):
                                    validation_warnings.append(f"{group_name}: Still incomplete after regeneration")
                                else:
                                    print(f"  ✓ Fixed {group_name}: Deleted {deleted_count} incomplete matches, created {len(group_matches)} new matches")
                
                response_data = {
                    'detail': f'Successfully generated {len(created_matches)} fixtures' + (f' (fixed {matches_regenerated} matches)' if matches_regenerated > 0 else ''),
                    'tournament_id': tournament.id,
                    'format': tournament.format,
                    'matches_created': len(created_matches),
                    'matches_regenerated': matches_regenerated
                }
                
                if validation_warnings:
                    response_data['validation_warnings'] = validation_warnings
                    response_data['warning_message'] = 'Fixtures generated but some validation issues may remain. Use "Fix Fixtures" button to repair.'
                
                return Response(response_data, status=status.HTTP_200_OK)
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

    @action(detail=True, methods=['post'], url_path='remove-last-team', permission_classes=[IsAuthenticated, IsTournamentOrganiser])
    def remove_last_team(self, request, pk=None):
        """Remove the most recently registered team from tournament (organiser only, for testing)"""
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or tournament.organizer_id != request.user.id:
            return Response(
                {'detail': 'Only the tournament organiser can remove teams'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the most recent registration
        last_registration = tournament.registrations.filter(
            status__in=['pending', 'paid']
        ).order_by('-created_at').first()
        
        if not last_registration:
            return Response(
                {'detail': 'No teams to remove'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        team_name = last_registration.team.name
        registration_id = last_registration.id
        
        # Delete the registration (team itself is not deleted, just the registration)
        last_registration.delete()
        
        # Get remaining team count
        remaining_count = tournament.registrations.filter(
            status__in=['pending', 'paid']
        ).count()
        
        return Response({
            'detail': f'Removed team "{team_name}"',
            'team_removed': team_name,
            'registration_id': registration_id,
            'remaining_teams': remaining_count,
            'tournament_id': tournament.id
        }, status=status.HTTP_200_OK)

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

    @action(detail=True, methods=['get'], url_path='debug-knockout', permission_classes=[IsAuthenticated, IsTournamentOrganiser])
    def debug_knockout(self, request, pk=None):
        """Debug endpoint to check knockout round generation state"""
        tournament = self.get_object()
        from .models import Match
        
        # Get all knockout matches (exclude group stage)
        knockout_matches = Match.objects.filter(
            tournament=tournament
        ).exclude(pitch__icontains='Group').order_by('pitch', 'kickoff_at')
        
        # Group by round name
        rounds = {}
        for match in knockout_matches:
            round_name = match.pitch or 'Unknown'
            if round_name not in rounds:
                rounds[round_name] = {
                    'total': 0,
                    'finished': 0,
                    'scheduled': 0,
                    'live': 0,
                    'matches': []
                }
            rounds[round_name]['total'] += 1
            rounds[round_name]['matches'].append({
                'id': match.id,
                'home': match.home_team.name if match.home_team else 'TBC',
                'away': match.away_team.name if match.away_team else 'TBC',
                'score': f"{match.home_score}-{match.away_score}",
                'penalties': f"{match.home_penalties}-{match.away_penalties}" if match.home_penalties is not None else None,
                'status': match.status
            })
            if match.status == 'finished':
                rounds[round_name]['finished'] += 1
            elif match.status == 'scheduled':
                rounds[round_name]['scheduled'] += 1
            elif match.status == 'live':
                rounds[round_name]['live'] += 1
        
        # Check if semi-finals are complete and if final should be generated
        semi_finals = rounds.get('Semi-Finals', {})
        final = rounds.get('Final', {})
        
        # Try to manually trigger final generation if conditions are met
        should_generate = (
            'Semi-Finals' in rounds and
            semi_finals.get('finished', 0) == semi_finals.get('total', 0) and
            semi_finals.get('total', 0) == 2 and
            'Final' not in rounds
        )
        
        generation_result = None
        if should_generate:
            try:
                from .simulation_helpers import generate_next_knockout_round
                generation_result = generate_next_knockout_round(tournament, 'Semi-Finals')
            except Exception as e:
                import traceback
                generation_result = {'error': str(e), 'traceback': traceback.format_exc()}
        
        debug_info = {
            'tournament_id': tournament.id,
            'tournament_name': tournament.name,
            'format': tournament.format,
            'rounds': rounds,
            'semi_finals_status': {
                'exists': 'Semi-Finals' in rounds,
                'total_matches': semi_finals.get('total', 0),
                'finished_matches': semi_finals.get('finished', 0),
                'all_finished': semi_finals.get('finished', 0) == semi_finals.get('total', 0) and semi_finals.get('total', 0) > 0,
                'matches': semi_finals.get('matches', [])
            },
            'final_status': {
                'exists': 'Final' in rounds,
                'total_matches': final.get('total', 0),
                'matches': final.get('matches', [])
            },
            'should_generate_final': should_generate,
            'generation_attempted': should_generate,
            'generation_result': generation_result
        }
        
        return Response(debug_info, status=status.HTTP_200_OK)

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
        
        # Clear selected MVP (since fixtures are being cleared)
        if tournament.structure and 'selected_mvp_player_id' in tournament.structure:
            tournament.structure.pop('selected_mvp_player_id')
            tournament.save(update_fields=['structure'])
        
        return Response({
            'detail': f'Successfully deleted {deleted_count} matches',
            'matches_deleted': deleted_count,
            'tournament_id': tournament.id
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reset-matches', permission_classes=[IsAuthenticated, IsOrganiser])
    def reset_matches(self, request, pk=None):
        """Reset all match results (scores, status) back to start, keeping teams and players.
        Deletes knockout matches, resets group matches."""
        from django.db import transaction
        
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response(
                {'detail': 'Only organisers can reset matches'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        with transaction.atomic():
            # Get all matches for this tournament
            all_matches = Match.objects.filter(tournament=tournament)
            
            # Separate group matches from knockout matches
            group_matches = []
            knockout_matches = []
            
            for match in all_matches:
                is_knockout = False
                if tournament.format == 'knockout':
                    # All matches in knockout format are knockout matches
                    is_knockout = True
                elif tournament.format == 'combination':
                    # In combination format, knockout matches don't have 'Group' in pitch
                    if match.pitch and 'Group' not in match.pitch:
                        is_knockout = True
                
                if is_knockout:
                    knockout_matches.append(match)
                else:
                    group_matches.append(match)
            
            # Delete all knockout matches (and their related data will cascade)
            knockout_matches_deleted = len(knockout_matches)
            for match in knockout_matches:
                # Delete scorers and assists first (they have FKs to match)
                MatchScorer.objects.filter(match=match).delete()
                MatchAssist.objects.filter(goal__match=match).delete()
                match.delete()
            
            # Reset group match scores, penalties, and status
            matches_reset = 0
            for match in group_matches:
                match.home_score = 0
                match.away_score = 0
                match.home_penalties = None
                match.away_penalties = None
                match.status = 'scheduled'
                match.save()
                matches_reset += 1
            
            # Delete all remaining match scorers and assists for group matches (should be empty but be safe)
            MatchScorer.objects.filter(match__tournament=tournament).delete()
            MatchAssist.objects.filter(goal__match__tournament=tournament).delete()
            
            # Reset tournament status to 'open' if it was completed
            if tournament.status == 'completed':
                tournament.status = 'open'
                tournament.save(update_fields=['status'])
            
            # Reset team stats (wins, draws, losses, goals_for, goals_against)
            team_ids = tournament.registrations.filter(
                status__in=['pending', 'paid']
            ).values_list('team_id', flat=True)
            
            Team.objects.filter(id__in=team_ids).update(
                wins=0,
                draws=0,
                losses=0,
                goals_for=0,
                goals_against=0
            )
            
            # Reset player stats (goals, assists, appearances, clean_sheets)
            Player.objects.filter(
                memberships__team_id__in=team_ids
            ).update(
                goals=0,
                assists=0,
                appearances=0,
                clean_sheets=0
            )
            
            # Clear selected MVP (since tournament is being reset)
            if tournament.structure and 'selected_mvp_player_id' in tournament.structure:
                tournament.structure.pop('selected_mvp_player_id')
                tournament.save(update_fields=['structure'])
        
        return Response({
            'detail': f'Successfully reset {matches_reset} group matches and deleted {knockout_matches_deleted} knockout matches',
            'matches_reset': matches_reset,
            'knockout_matches_deleted': knockout_matches_deleted,
            'tournament_id': tournament.id,
            'tournament_status': tournament.status
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='fix-fixtures', permission_classes=[IsAuthenticated, IsOrganiser])
    def fix_fixtures(self, request, pk=None):
        """
        Fix incomplete fixtures by regenerating matches for groups that don't have all required matches.
        This will delete incomplete matches and regenerate them properly.
        """
        from django.db import transaction
        from .tournament_formats import generate_groups, validate_round_robin_completeness, generate_round_robin_for_group
        from datetime import datetime
        
        tournament = self.get_object()
        
        if tournament.format != 'combination':
            return Response({
                'detail': 'Fixture fixing is only available for combination format tournaments',
                'skipped': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        structure = tournament.structure or {}
        combination_type = structure.get('combination_type', 'combinationA')
        if combination_type != 'combinationB':
            return Response({
                'detail': 'Fixture fixing is only available for combinationB (Groups → Knockout) format',
                'skipped': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        teams = list(Team.objects.filter(
            registrations__tournament=tournament,
            registrations__status__in=['pending', 'paid']
        ).distinct())
        
        if len(teams) < 2:
            return Response({
                'detail': 'Need at least 2 teams to fix fixtures',
                'skipped': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        groups = generate_groups(teams, 'combinationB')
        
        fixed_groups = []
        matches_deleted = 0
        matches_created = 0
        
        with transaction.atomic():
            for group in groups:
                group_name = group['name']
                group_teams = group['teams']
                
                # Get existing matches for this group
                existing_matches = Match.objects.filter(
                    tournament=tournament,
                    pitch__startswith=group_name
                )
                
                # Validate completeness
                existing_matches_list = list(existing_matches)
                validation_result = validate_round_robin_completeness(group_teams, existing_matches_list, group_name)
                
                if not validation_result.get('valid', False):
                    # Delete all existing matches for this group
                    count = existing_matches.count()
                    existing_matches.delete()
                    matches_deleted += count
                    
                    # Regenerate all matches for this group
                    start_date = datetime.now()
                    group_matches = generate_round_robin_for_group(
                        group_teams,
                        tournament,
                        group_name,
                        start_date,
                        start_round=1
                    )
                    
                    # Save new matches
                    for round_num, match_obj in group_matches:
                        match_obj.save()
                        matches_created += 1
                    
                    fixed_groups.append({
                        'group': group_name,
                        'matches_deleted': count,
                        'matches_created': len(group_matches)
                    })
        
        if not fixed_groups:
            return Response({
                'detail': 'All groups already have complete fixtures. No fixes needed.',
                'fixed_groups': [],
                'matches_deleted': 0,
                'matches_created': 0
            }, status=status.HTTP_200_OK)
        
        return Response({
            'detail': f'Fixed {len(fixed_groups)} group(s). Deleted {matches_deleted} incomplete matches, created {matches_created} new matches.',
            'fixed_groups': fixed_groups,
            'matches_deleted': matches_deleted,
            'matches_created': matches_created
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='validate-fixtures', permission_classes=[IsAuthenticated, IsOrganiser])
    def validate_fixtures(self, request, pk=None):
        """Validate that all teams have equal number of scheduled matches (for round-robin groups)"""
        from .tournament_formats import generate_groups, validate_round_robin_completeness
        
        tournament = self.get_object()
        
        # Only validate combinationB format (Groups → Knockout)
        if tournament.format != 'combination':
            return Response({
                'valid': True,
                'message': 'Fixture validation is only available for combination format tournaments',
                'validation_skipped': True
            })
        
        structure = tournament.structure or {}
        combination_type = structure.get('combination_type', 'combinationA')
        if combination_type != 'combinationB':
            return Response({
                'valid': True,
                'message': 'Fixture validation is only available for combinationB (Groups → Knockout) format',
                'validation_skipped': True
            })
        
        # Get all teams and matches
        teams = list(Team.objects.filter(
            registrations__tournament=tournament,
            registrations__status__in=['pending', 'paid']
        ).distinct())
        
        all_matches = list(Match.objects.filter(tournament=tournament))
        
        # Generate groups (same logic as fixture generation)
        groups = generate_groups(teams, 'combinationB')
        
        # Validate each group
        all_valid = True
        group_validations = {}
        
        for group in groups:
            group_name = group['name']
            group_teams = group['teams']
            validation_result = validate_round_robin_completeness(group_teams, all_matches, group_name)
            group_validations[group_name] = validation_result
            if not validation_result.get('valid', False):
                all_valid = False
        
        return Response({
            'valid': all_valid,
            'groups': group_validations,
            'message': 'All groups have complete fixtures' if all_valid else 'Some groups have incomplete fixtures'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='generate-knockouts', permission_classes=[IsAuthenticated, IsOrganiser])
    def generate_knockouts(self, request, pk=None):
        """Manually generate knockout stage from group qualifiers (organiser only)"""
        tournament = self.get_object()
        
        # Check permission
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response(
                {'detail': 'Only organisers can generate knockouts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if tournament format supports this
        if tournament.format != 'combination':
            return Response(
                {'detail': 'Knockout generation is only available for combination format tournaments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        structure = tournament.structure or {}
        combination_type = structure.get('combination_type', 'combinationA')
        if combination_type != 'combinationB':
            return Response(
                {'detail': 'Knockout generation is only available for combinationB (Groups → Knockout) format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if knockout stage already exists
        from .models import Match
        knockout_matches = Match.objects.filter(
            tournament=tournament
        ).exclude(pitch__icontains='Group')
        
        if knockout_matches.exists():
            return Response({
                'detail': 'Knockout stage already exists',
                'already_generated': True,
                'tournament_id': tournament.id
            }, status=status.HTTP_200_OK)
        
        # Attempt to generate knockout stage
        try:
            from .simulation_helpers import generate_knockout_stage_from_groups
            result = generate_knockout_stage_from_groups(tournament)
            
            if result:
                return Response({
                    'detail': 'Knockout stage generated successfully',
                    'generated': True,
                    'tournament_id': tournament.id
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'detail': 'Failed to generate knockout stage. Please ensure all group matches are finished and qualifiers can be determined.',
                    'generated': False,
                    'tournament_id': tournament.id
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'detail': f'Error generating knockout stage: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
    
    @action(detail=True, methods=['post'], url_path='register', permission_classes=[IsAuthenticated, IsOrganiser])
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
    
    def get_permissions(self):
        """Apply different permissions based on action"""
        if self.action in ['list', 'retrieve', 'by_slug']:
            permission_classes = [AllowAny]
        else:
            # Create, update, delete require organiser
            permission_classes = [IsAuthenticated, IsOrganiser]
        return [permission() for permission in permission_classes]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=False, methods=['get'], url_path='by-slug/(?P<slug>[^/.]+)', permission_classes=[AllowAny])
    def by_slug(self, request, slug=None):
        """Get team by slug (public endpoint)"""
        try:
            team = Team.objects.get(slug=slug)
            serializer = self.get_serializer(team)
            return Response(serializer.data)
        except Team.DoesNotExist:
            return Response(
                {'detail': 'Team not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class RegistrationViewSet(mixins.CreateModelMixin,
                          mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.UpdateModelMixin,
                          mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    queryset = Registration.objects.select_related("tournament","team").all()
    serializer_class = RegistrationSerializer
    
    def get_permissions(self):
        """Apply different permissions based on action"""
        if self.action in ['list', 'retrieve', 'status']:
            permission_classes = [AllowAny]
        else:
            # Create, update, delete require organiser
            permission_classes = [IsAuthenticated, IsOrganiser]
        return [permission() for permission in permission_classes]

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
    
    def get_permissions(self):
        """Apply different permissions based on action"""
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            # Create, update, delete require organiser
            permission_classes = [IsAuthenticated, IsOrganiser]
        return [permission() for permission in permission_classes]

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
        if (tournament.format == 'knockout' or 
            (tournament.format == 'combination' and match.pitch and 'Group' not in match.pitch)):
            if match.pitch:
                try:
                    generate_next_knockout_round(tournament, match.pitch)
                except Exception as e:
                    print(f"Error generating next knockout round: {str(e)}")
                    # Don't fail if next round generation fails
        
        return Response({
            'detail': 'Match ended',
            'status': match.status
        })

    @action(detail=True, methods=['post'], url_path='score', permission_classes=[IsAuthenticated, IsOrganiser])
    def set_score(self, request, pk=None):
        from django.db import transaction
        # MatchScorer and MatchAssist already imported at top of file
        
        match = self.get_object()
        try:
            hs = int(request.data.get('home_score', 0))
            as_ = int(request.data.get('away_score', 0))
            # NEW: Penalty scores (for knockout matches)
            home_penalties = request.data.get('home_penalties')
            away_penalties = request.data.get('away_penalties')
            if home_penalties is not None:
                home_penalties = int(home_penalties)
            if away_penalties is not None:
                away_penalties = int(away_penalties)
            # NEW: Support assists - arrays of player IDs (one per goal)
            home_scorers = request.data.get('home_scorers', [])  # List of player IDs (one per goal)
            away_scorers = request.data.get('away_scorers', [])  # List of player IDs (one per goal)
            home_assists = request.data.get('home_assists', [])  # NEW: List of assister IDs or null (one per goal)
            away_assists = request.data.get('away_assists', [])  # NEW: List of assister IDs or null (one per goal)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid score'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if this is a knockout match
        is_knockout = False
        if match.tournament.format == 'knockout':
            is_knockout = True
        elif match.tournament.format == 'combination':
            # Check if pitch indicates knockout stage (not group stage)
            if match.pitch and 'Group' not in match.pitch:
                is_knockout = True
        
        # If knockout match ends in draw, require penalties
        if is_knockout and hs == as_:
            if home_penalties is None or away_penalties is None:
                return Response({
                    'detail': 'Knockout matches cannot end in a draw. Please provide penalty scores.',
                    'requires_penalties': True
                }, status=status.HTTP_400_BAD_REQUEST)
            # Ensure there's a winner
            if home_penalties == away_penalties:
                return Response({
                    'detail': 'Penalty scores cannot be equal. One team must win.',
                    'requires_penalties': True
                }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Clear existing scorers and assists for this match
            MatchAssist.objects.filter(match=match).delete()  # NEW: Delete assists first (due to FK)
            MatchScorer.objects.filter(match=match).delete()
            
            # Update match score
            match.home_score = max(0, hs)
            match.away_score = max(0, as_)
            
            # Clear penalties for non-draws or non-knockout matches
            if is_knockout and hs == as_:
                match.home_penalties = home_penalties
                match.away_penalties = away_penalties
            else:
                match.home_penalties = None
                match.away_penalties = None
            
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
        
        # Store info for post-transaction next round generation
        should_generate_next_round = False
        round_name_for_generation = None
        tournament_for_generation = None
        should_check_group_qualifiers = False
        
        if match.status == 'finished':
            tournament_for_generation = match.tournament
            
            # Check if this is a group stage match in combinationB format
            if (tournament_for_generation.format == 'combination' and 
                match.pitch and 'Group' in match.pitch):
                structure = tournament_for_generation.structure or {}
                combination_type = structure.get('combination_type', 'combinationA')
                if combination_type == 'combinationB':
                    should_check_group_qualifiers = True
            
            # Check if this is a knockout match that should generate next round
            if (tournament_for_generation.format == 'knockout' or 
                (tournament_for_generation.format == 'combination' and match.pitch and 'Group' not in match.pitch)):
                if match.pitch:
                    should_generate_next_round = True
                    round_name_for_generation = match.pitch.strip()
        
        response_data = self.get_serializer(match).data
        
        # Auto-generate next knockout round if applicable (AFTER transaction commits)
        # This ensures the match is fully saved and visible to queries
        if should_generate_next_round:
            try:
                from .simulation_helpers import generate_next_knockout_round
                # Refresh match from DB to ensure we have latest committed state
                match.refresh_from_db()
                
                print(f"\n{'='*60}")
                print(f"SET_SCORE: Attempting to generate next round after finishing match")
                print(f"  Match ID: {match.id}")
                print(f"  Tournament: {tournament_for_generation.name} (ID: {tournament_for_generation.id})")
                print(f"  Tournament Format: {tournament_for_generation.format}")
                print(f"  Match Pitch: '{match.pitch}'")
                print(f"  Round Name for Generation: '{round_name_for_generation}'")
                print(f"  Match Status (after refresh): {match.status}")
                print(f"  Match Score: {match.home_score}-{match.away_score}")
                print(f"  Match Penalties: {match.home_penalties}-{match.away_penalties}")
                print(f"  Is Knockout: {is_knockout}")
                print(f"{'='*60}\n")
                
                result = generate_next_knockout_round(tournament_for_generation, round_name_for_generation)
                if result:
                    print(f"\n{'='*60}")
                    print(f"✓ SUCCESS: Generated next round after '{round_name_for_generation}'")
                    print(f"  Match ID: {match.id}, Tournament: {tournament_for_generation.name}")
                    print(f"{'='*60}\n")
                else:
                    print(f"\n{'='*60}")
                    print(f"✗ FAILED: Next round generation returned False for '{round_name_for_generation}'")
                    print(f"  Match ID: {match.id}, Tournament: {tournament_for_generation.name}")
                    print(f"  Check the logs above for detailed reasons")
                    # Check if Final already exists when generation fails for Semi-Finals
                    if round_name_for_generation.lower() in ['semi-finals', 'semi finals', 'semifinals']:
                        from .models import Match
                        existing_final = Match.objects.filter(
                            tournament=tournament_for_generation
                        ).exclude(pitch__icontains='Group').filter(
                            pitch__icontains='final'
                        )
                        print(f"  DEBUG: Checking if Final already exists...")
                        print(f"  Found {existing_final.count()} match(es) with pitch containing 'final':")
                        for m in existing_final:
                            print(f"    Match {m.id}: pitch='{m.pitch}', status={m.status}")
                    print(f"{'='*60}\n")
            except Exception as e:
                import traceback
                print(f"\n{'='*60}")
                print(f"✗ EXCEPTION generating next knockout round after score update: {str(e)}")
                print(traceback.format_exc())
                print(f"{'='*60}\n")
                # Don't fail if next round generation fails, but log the error
        
        # Auto-generate knockout stage from groups if qualifiers can be determined (AFTER transaction commits)
        if should_check_group_qualifiers:
            try:
                from .simulation_helpers import can_determine_group_qualifiers, generate_knockout_stage_from_groups
                match.refresh_from_db()
                
                print(f"\n{'='*60}")
                print(f"SET_SCORE: Checking if group qualifiers can be determined")
                print(f"  Match ID: {match.id}")
                print(f"  Tournament: {tournament_for_generation.name} (ID: {tournament_for_generation.id})")
                print(f"  Match Pitch: '{match.pitch}'")
                print(f"{'='*60}\n")
                
                if can_determine_group_qualifiers(tournament_for_generation):
                    print(f"All group matches finished. Auto-generating knockout stage...")
                    knockout_generated = generate_knockout_stage_from_groups(tournament_for_generation)
                    if knockout_generated:
                        print(f"✓ SUCCESS: Knockout stage auto-generated")
                        response_data['knockout_stage_generated'] = True
                    else:
                        print(f"Knockout stage generation returned False (may already exist)")
                else:
                    print(f"Group stage not yet complete. Cannot determine qualifiers yet.")
            except Exception as e:
                import traceback
                print(f"\n{'='*60}")
                print(f"✗ EXCEPTION generating knockout stage after score update: {str(e)}")
                print(traceback.format_exc())
                print(f"{'='*60}\n")
        
        # Check if tournament should be marked as completed
        if match.status == 'finished':
            from .models import Match
            all_matches = Match.objects.filter(tournament=match.tournament)
            all_finished = all_matches.filter(status='finished').count()
            total_matches = all_matches.count()
            
            # If all matches are finished, mark tournament as completed
            if total_matches > 0 and all_finished == total_matches:
                if match.tournament.status != 'completed':
                    match.tournament.status = 'completed'
                    match.tournament.save()
                    print(f"\n{'='*60}")
                    print(f"✓ Tournament '{match.tournament.name}' marked as COMPLETED")
                    print(f"  All {total_matches} matches finished")
                    print(f"{'='*60}\n")
        
        return Response(response_data)

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
    Register a new manager user - DISABLED in single organiser mode
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        return Response(
            {'detail': 'Registration is disabled. Please contact the organiser.'}, 
            status=status.HTTP_403_FORBIDDEN
        )