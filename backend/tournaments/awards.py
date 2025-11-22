"""
Awards calculation module for tournaments.
Calculates Top Scorer, MVP, Tournament Winner, Runner-up, and Third Place.
"""
from django.db.models import Count, Q, F
from .models import Tournament, Match, MatchScorer, MatchAssist, Player, Team, TeamPlayer


def get_top_scorer(tournament):
    """
    Get player with most goals in tournament.
    Returns dict with player info, team, and goals count.
    """
    # Get all matches in tournament
    matches = Match.objects.filter(tournament=tournament, status='finished')
    
    # Count goals per player
    scorer_counts = MatchScorer.objects.filter(
        match__in=matches
    ).values(
        'player_id', 'player__first_name', 'player__last_name'
    ).annotate(
        goals=Count('id')
    ).order_by('-goals')
    
    if not scorer_counts:
        return None
    
    top_scorer_data = scorer_counts[0]
    player_id = top_scorer_data['player_id']
    
    # Get player's team in this tournament
    team_player = TeamPlayer.objects.filter(
        player_id=player_id,
        team__tournament=tournament
    ).select_related('team').first()
    
    return {
        'player': {
            'id': player_id,
            'first_name': top_scorer_data['player__first_name'],
            'last_name': top_scorer_data['player__last_name'],
            'full_name': f"{top_scorer_data['player__first_name']} {top_scorer_data['player__last_name']}".strip()
        },
        'team': {
            'id': team_player.team.id if team_player else None,
            'name': team_player.team.name if team_player else 'Unknown'
        } if team_player else None,
        'goals': top_scorer_data['goals']
    }


def get_mvp(tournament):
    """
    Get Most Valuable Player (highest goals + assists).
    Formula: goals * 1 + assists * 1
    Tiebreaker: Most goals wins.
    """
    matches = Match.objects.filter(tournament=tournament, status='finished')
    
    # Get all players who scored or assisted
    player_stats = {}
    
    # Count goals per player
    scorers = MatchScorer.objects.filter(match__in=matches).values('player_id').annotate(goals=Count('id'))
    for scorer in scorers:
        player_id = scorer['player_id']
        if player_id not in player_stats:
            player_stats[player_id] = {'goals': 0, 'assists': 0}
        player_stats[player_id]['goals'] = scorer['goals']
    
    # Count assists per player
    assists = MatchAssist.objects.filter(
        match__in=matches,
        player__isnull=False
    ).values('player_id').annotate(assists=Count('id'))
    
    for assist in assists:
        player_id = assist['player_id']
        if player_id not in player_stats:
            player_stats[player_id] = {'goals': 0, 'assists': 0}
        player_stats[player_id]['assists'] = assist['assists']
    
    if not player_stats:
        return None
    
    # Calculate MVP score: goals + assists
    mvp_candidates = []
    for player_id, stats in player_stats.items():
        mvp_score = stats['goals'] + stats['assists']
        if mvp_score > 0:
            mvp_candidates.append({
                'player_id': player_id,
                'goals': stats['goals'],
                'assists': stats['assists'],
                'mvp_score': mvp_score
            })
    
    if not mvp_candidates:
        return None
    
    # Sort by MVP score (desc), then by goals (desc) as tiebreaker
    mvp_candidates.sort(key=lambda x: (-x['mvp_score'], -x['goals']))
    top_mvp = mvp_candidates[0]
    
    # Get player details
    player = Player.objects.get(id=top_mvp['player_id'])
    
    # Get player's team in this tournament
    team_player = TeamPlayer.objects.filter(
        player_id=top_mvp['player_id'],
        team__tournament=tournament
    ).select_related('team').first()
    
    return {
        'player': {
            'id': player.id,
            'first_name': player.first_name,
            'last_name': player.last_name,
            'full_name': str(player)
        },
        'team': {
            'id': team_player.team.id if team_player else None,
            'name': team_player.team.name if team_player else 'Unknown'
        } if team_player else None,
        'goals': top_mvp['goals'],
        'assists': top_mvp['assists'],
        'mvp_score': top_mvp['mvp_score']
    }


def get_tournament_winner(tournament):
    """
    Get tournament winner team.
    - For league: 1st place in standings
    - For knockout: Winner of final match
    - For combination: Winner of knockout stage final
    """
    if tournament.format == 'league':
        # Calculate standings manually (same logic as views.py)
        teams = list(Team.objects.filter(registrations__tournament=tournament, registrations__status__in=['pending', 'paid']).distinct())
        matches = Match.objects.filter(tournament=tournament, status='finished')
        
        standings = []
        for team in teams:
            team_matches = matches.filter(
                Q(home_team=team) | Q(away_team=team)
            )
            
            points = 0
            wins = 0
            draws = 0
            losses = 0
            goals_for = 0
            goals_against = 0
            
            for match in team_matches:
                if match.home_team == team:
                    goals_for += match.home_score or 0
                    goals_against += match.away_score or 0
                    if match.home_score > match.away_score:
                        wins += 1
                        points += 3
                    elif match.home_score == match.away_score:
                        draws += 1
                        points += 1
                    else:
                        losses += 1
                else:
                    goals_for += match.away_score or 0
                    goals_against += match.home_score or 0
                    if match.away_score > match.home_score:
                        wins += 1
                        points += 3
                    elif match.away_score == match.home_score:
                        draws += 1
                        points += 1
                    else:
                        losses += 1
            
            standings.append({
                'team': team,
                'points': points,
                'goal_difference': goals_for - goals_against,
                'goals_for': goals_for
            })
        
        # Sort by points, goal difference, goals for
        standings.sort(key=lambda x: (x['points'], x['goal_difference'], x['goals_for']), reverse=True)
        
        if standings and len(standings) > 0:
            winner_team = standings[0].get('team')
            if winner_team:
                return {
                    'team': {
                        'id': winner_team.id,
                        'name': winner_team.name
                    },
                    'position': 1
                }
    
    elif tournament.format == 'knockout':
        # Find the final match (last match in knockout bracket)
        final_match = Match.objects.filter(
            tournament=tournament,
            status='finished'
        ).order_by('-kickoff_at').first()
        
        if final_match and final_match.home_score is not None and final_match.away_score is not None:
            # Determine winner
            if final_match.home_score > final_match.away_score:
                winner_team = final_match.home_team
            elif final_match.away_score > final_match.home_score:
                winner_team = final_match.away_team
            else:
                # Draw - check for penalties or extra time (if implemented)
                # For now, return None if draw
                return None
            
            return {
                'team': {
                    'id': winner_team.id,
                    'name': winner_team.name
                },
                'position': 1
            }
    
    elif tournament.format == 'combination':
        # For combination, find the final match of knockout stage
        # Knockout matches typically have "Round" or "Final" in pitch field
        final_match = Match.objects.filter(
            tournament=tournament,
            status='finished',
            pitch__icontains='final'
        ).order_by('-kickoff_at').first()
        
        if not final_match:
            # Try to find the last match
            final_match = Match.objects.filter(
                tournament=tournament,
                status='finished'
            ).order_by('-kickoff_at').first()
        
        if final_match and final_match.home_score is not None and final_match.away_score is not None:
            if final_match.home_score > final_match.away_score:
                winner_team = final_match.home_team
            elif final_match.away_score > final_match.home_score:
                winner_team = final_match.away_team
            else:
                return None
            
            return {
                'team': {
                    'id': winner_team.id,
                    'name': winner_team.name
                },
                'position': 1
            }
    
    return None


def get_tournament_runner_up(tournament):
    """
    Get runner-up team (2nd place).
    """
    if tournament.format == 'league':
        # Calculate standings manually (same logic as views.py)
        teams = list(Team.objects.filter(registrations__tournament=tournament, registrations__status__in=['pending', 'paid']).distinct())
        matches = Match.objects.filter(tournament=tournament, status='finished')
        
        standings = []
        for team in teams:
            team_matches = matches.filter(
                Q(home_team=team) | Q(away_team=team)
            )
            
            points = 0
            wins = 0
            draws = 0
            losses = 0
            goals_for = 0
            goals_against = 0
            
            for match in team_matches:
                if match.home_team == team:
                    goals_for += match.home_score or 0
                    goals_against += match.away_score or 0
                    if match.home_score > match.away_score:
                        wins += 1
                        points += 3
                    elif match.home_score == match.away_score:
                        draws += 1
                        points += 1
                    else:
                        losses += 1
                else:
                    goals_for += match.away_score or 0
                    goals_against += match.home_score or 0
                    if match.away_score > match.home_score:
                        wins += 1
                        points += 3
                    elif match.away_score == match.home_score:
                        draws += 1
                        points += 1
                    else:
                        losses += 1
            
            standings.append({
                'team': team,
                'points': points,
                'goal_difference': goals_for - goals_against,
                'goals_for': goals_for
            })
        
        # Sort by points, goal difference, goals for
        standings.sort(key=lambda x: (x['points'], x['goal_difference'], x['goals_for']), reverse=True)
        
        if standings and len(standings) > 1:
            runner_up_team = standings[1].get('team')
            if runner_up_team:
                return {
                    'team': {
                        'id': runner_up_team.id,
                        'name': runner_up_team.name
                    },
                    'position': 2
                }
    
    elif tournament.format == 'knockout':
        # Find the final match and return the loser
        final_match = Match.objects.filter(
            tournament=tournament,
            status='finished'
        ).order_by('-kickoff_at').first()
        
        if final_match and final_match.home_score is not None and final_match.away_score is not None:
            if final_match.home_score > final_match.away_score:
                runner_up_team = final_match.away_team
            elif final_match.away_score > final_match.home_score:
                runner_up_team = final_match.home_team
            else:
                return None
            
            return {
                'team': {
                    'id': runner_up_team.id,
                    'name': runner_up_team.name
                },
                'position': 2
            }
    
    elif tournament.format == 'combination':
        final_match = Match.objects.filter(
            tournament=tournament,
            status='finished',
            pitch__icontains='final'
        ).order_by('-kickoff_at').first()
        
        if not final_match:
            final_match = Match.objects.filter(
                tournament=tournament,
                status='finished'
            ).order_by('-kickoff_at').first()
        
        if final_match and final_match.home_score is not None and final_match.away_score is not None:
            if final_match.home_score > final_match.away_score:
                runner_up_team = final_match.away_team
            elif final_match.away_score > final_match.home_score:
                runner_up_team = final_match.home_team
            else:
                return None
            
            return {
                'team': {
                    'id': runner_up_team.id,
                    'name': runner_up_team.name
                },
                'position': 2
            }
    
    return None


def get_tournament_third_place(tournament):
    """
    Get third place team (if applicable).
    For league: 3rd place in standings
    For knockout: Usually not applicable unless there's a third place match
    For combination: 3rd place in standings if league stage, or third place match if knockout
    """
    if tournament.format == 'league':
        # Calculate standings manually (same logic as views.py)
        teams = list(Team.objects.filter(registrations__tournament=tournament, registrations__status__in=['pending', 'paid']).distinct())
        matches = Match.objects.filter(tournament=tournament, status='finished')
        
        standings = []
        for team in teams:
            team_matches = matches.filter(
                Q(home_team=team) | Q(away_team=team)
            )
            
            points = 0
            wins = 0
            draws = 0
            losses = 0
            goals_for = 0
            goals_against = 0
            
            for match in team_matches:
                if match.home_team == team:
                    goals_for += match.home_score or 0
                    goals_against += match.away_score or 0
                    if match.home_score > match.away_score:
                        wins += 1
                        points += 3
                    elif match.home_score == match.away_score:
                        draws += 1
                        points += 1
                    else:
                        losses += 1
                else:
                    goals_for += match.away_score or 0
                    goals_against += match.home_score or 0
                    if match.away_score > match.home_score:
                        wins += 1
                        points += 3
                    elif match.away_score == match.home_score:
                        draws += 1
                        points += 1
                    else:
                        losses += 1
            
            standings.append({
                'team': team,
                'points': points,
                'goal_difference': goals_for - goals_against,
                'goals_for': goals_for
            })
        
        # Sort by points, goal difference, goals for
        standings.sort(key=lambda x: (x['points'], x['goal_difference'], x['goals_for']), reverse=True)
        
        if standings and len(standings) > 2:
            third_place_team = standings[2].get('team')
            if third_place_team:
                return {
                    'team': {
                        'id': third_place_team.id,
                        'name': third_place_team.name
                    },
                    'position': 3
                }
    
    elif tournament.format == 'combination':
        # For combination, check if there's a third place match or use standings
        third_place_match = Match.objects.filter(
            tournament=tournament,
            status='finished',
            pitch__icontains='third'
        ).first()
        
        if third_place_match:
            if third_place_match.home_score > third_place_match.away_score:
                third_place_team = third_place_match.home_team
            elif third_place_match.away_score > third_place_match.home_score:
                third_place_team = third_place_match.away_team
            else:
                return None
            
            return {
                'team': {
                    'id': third_place_team.id,
                    'name': third_place_team.name
                },
                'position': 3
            }
        else:
            # Fall back to standings if available
            from .tournament_formats import calculate_group_standings, generate_groups
            groups = generate_groups(list(Team.objects.filter(tournament=tournament)), tournament.format)
            # This is complex for combination, return None for now
            return None
    
    # Knockout format typically doesn't have third place
    return None

