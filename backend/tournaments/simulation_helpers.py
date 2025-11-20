"""
Helper functions for simulating tournament matches round by round
"""
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from tournaments.models import Match, Player, TeamPlayer, MatchScorer, MatchAssist, Team
from collections import Counter
import random


def get_next_round_matches(tournament):
    """
    Get the next round of unsimulated matches for a tournament
    
    Returns:
        tuple: (round_number, list of matches in this round, is_league_stage)
        Returns (None, [], False) if no matches found
    """
    # Get all scheduled matches
    scheduled_matches = Match.objects.filter(
        tournament=tournament,
        status='scheduled'
    ).order_by('kickoff_at')
    
    if not scheduled_matches.exists():
        return (None, [], False)
    
    # Group matches by kickoff date (round = same day)
    matches_by_date = {}
    for match in scheduled_matches:
        date_key = match.kickoff_at.date()
        if date_key not in matches_by_date:
            matches_by_date[date_key] = []
        matches_by_date[date_key].append(match)
    
    # Get the earliest round (first date with scheduled matches)
    if not matches_by_date:
        return (None, [], False)
    
    earliest_date = min(matches_by_date.keys())
    round_matches = matches_by_date[earliest_date]
    
    # Determine round number (count how many rounds have been completed)
    completed_matches = Match.objects.filter(
        tournament=tournament,
        status='finished'
    ).order_by('kickoff_at')
    
    if completed_matches.exists():
        # Count unique dates with completed matches
        completed_dates = set(
            m.kickoff_at.date() 
            for m in completed_matches
        )
        round_number = len(completed_dates) + 1
    else:
        round_number = 1
    
    # Determine if this is league stage or knockout
    # Check tournament format
    is_league_stage = True
    if tournament.format == 'combination':
        structure = tournament.structure or {}
        combination_type = structure.get('combination_type', 'combinationA')
        
        if combination_type == 'combinationA':
            # League → Knockout format
            # Count total teams and determine league stage length
            num_teams = tournament.registrations.filter(status__in=['pending', 'paid']).count()
            expected_league_rounds = num_teams - 1 if num_teams > 1 else 0
            
            # If we've completed league rounds, this is knockout
            if round_number > expected_league_rounds:
                is_league_stage = False
        elif combination_type == 'combinationB':
            # Groups → Knockout format
            # League stage is group stage - matches have group name in pitch field
            if round_matches and round_matches[0].pitch and not round_matches[0].pitch.startswith('Group'):
                # If pitch doesn't indicate a group, it's likely knockout
                is_league_stage = False
    elif tournament.format == 'knockout':
        is_league_stage = False
    
    return (round_number, round_matches, is_league_stage)


def simulate_round(tournament):
    """
    Simulate one round of matches for a tournament
    
    Returns:
        dict with 'round_number', 'matches_simulated', 'is_league_stage', 'message'
    """
    round_number, round_matches, is_league_stage = get_next_round_matches(tournament)
    
    if not round_matches:
        return {
            'round_number': None,
            'matches_simulated': 0,
            'is_league_stage': False,
            'message': 'No matches to simulate'
        }
    
    matches_simulated = 0
    failed_matches = []
    
    # Simulate each match individually, continue even if some fail
    for match in round_matches:
        try:
            # Use transaction for each match individually
            with transaction.atomic():
                simulate_match(match)
            matches_simulated += 1
        except Exception as e:
            # Log the failed match but continue with others
            failed_matches.append({
                'match_id': match.id,
                'home_team': match.home_team.name if match.home_team else 'Unknown',
                'away_team': match.away_team.name if match.away_team else 'Unknown',
                'error': str(e)
            })
    
    stage_name = "League Stage" if is_league_stage else "Knockout Stage"
    
    # After simulating a knockout round, generate next round if applicable
    next_round_created = False
    if not is_league_stage and tournament.format == 'knockout' and matches_simulated > 0:
        try:
            next_round_created = generate_next_knockout_round(tournament, round_number)
        except Exception as e:
            # Log error but don't fail the simulation
            print(f"Error generating next knockout round: {str(e)}")
    
    if failed_matches:
        error_details = '; '.join([f"{m['home_team']} vs {m['away_team']}: {m['error']}" for m in failed_matches[:3]])
        if len(failed_matches) > 3:
            error_details += f" (and {len(failed_matches) - 3} more)"
        message = f'Simulated Round {round_number} ({stage_name}): {matches_simulated} matches completed, {len(failed_matches)} failed. Errors: {error_details}'
    else:
        message = f'Simulated Round {round_number} ({stage_name}): {matches_simulated} matches completed'
        if next_round_created:
            message += ' (Next round generated)'
    
    return {
        'round_number': round_number,
        'matches_simulated': matches_simulated,
        'matches_failed': len(failed_matches),
        'is_league_stage': is_league_stage,
        'message': message,
        'failed_matches': failed_matches if failed_matches else None,
        'next_round_created': next_round_created
    }


def generate_next_knockout_round(tournament, completed_round_number):
    """
    Generate the next round of knockout matches after a round completes.
    Only generates if all matches in the current round are finished.
    
    Args:
        tournament: Tournament instance
        completed_round_number: The round number that just completed
    
    Returns:
        bool: True if next round was created, False otherwise
    """
    # Get all matches from the completed round
    completed_round_matches = Match.objects.filter(
        tournament=tournament,
        pitch__icontains=f'Round {completed_round_number}'
    )
    
    # Check if all matches in this round are finished
    if not completed_round_matches.exists():
        return False
    
    unfinished = completed_round_matches.filter(status__in=['scheduled', 'live'])
    if unfinished.exists():
        # Not all matches finished yet, don't generate next round
        return False
    
    # Get winners from completed matches
    winners = []
    for match in completed_round_matches:
        if match.status == 'finished' and match.home_score is not None and match.away_score is not None:
            if match.home_score > match.away_score:
                winners.append(match.home_team)
            elif match.away_score > match.home_score:
                winners.append(match.away_team)
            # If draw, we need to handle it (penalties, etc.) - for now, skip
            # In real knockout, draws shouldn't happen, but handle gracefully
    
    # Need at least 2 winners to create next round
    if len(winners) < 2:
        return False
    
    # Check if next round already exists
    next_round_number = completed_round_number + 1
    existing_next_round = Match.objects.filter(
        tournament=tournament,
        pitch__icontains=f'Round {next_round_number}'
    )
    if existing_next_round.exists():
        # Next round already exists
        return False
    
    # Calculate next round date (1 day after last match in completed round)
    last_match = completed_round_matches.order_by('-kickoff_at').first()
    if not last_match:
        return False
    
    next_round_date = last_match.kickoff_at + timedelta(days=1)
    
    # Create matches for next round
    num_matches = len(winners) // 2
    matches_created = 0
    
    for i in range(num_matches):
        home_team = winners[i * 2]
        away_team = winners[i * 2 + 1]
        
        Match.objects.create(
            tournament=tournament,
            home_team=home_team,
            away_team=away_team,
            kickoff_at=next_round_date,
            status='scheduled',
            pitch=f'Round {next_round_number}'
        )
        matches_created += 1
    
    return matches_created > 0


def simulate_match(match):
    """
    Simulate a single match with realistic scores, scorers, and assisters
    
    Args:
        match: Match instance to simulate
    
    Raises:
        ValueError: If teams don't have players
    """
    # Get team players
    home_players = list(Player.objects.filter(memberships__team=match.home_team))
    away_players = list(Player.objects.filter(memberships__team=match.away_team))
    
    if not home_players:
        raise ValueError(f"Home team {match.home_team.name} has no players. Please seed players first.")
    if not away_players:
        raise ValueError(f"Away team {match.away_team.name} has no players. Please seed players first.")
    
    # Generate realistic scores (most matches 0-3 goals per team, occasional high scores)
    home_score = 0
    away_score = 0
    
    # 70% chance of home advantage (slightly higher scores)
    home_advantage = random.random() < 0.7
    
    # Score distribution: mostly 0-3 goals, occasionally 4-5
    if random.random() < 0.7:  # 70% chance of low-scoring match
        home_score = random.choices([0, 1, 2, 3], weights=[15, 30, 35, 20])[0]
        away_score = random.choices([0, 1, 2, 3], weights=[15, 30, 35, 20])[0]
    else:  # 30% chance of high-scoring match
        home_score = random.choices([2, 3, 4, 5], weights=[30, 40, 20, 10])[0]
        away_score = random.choices([2, 3, 4, 5], weights=[30, 40, 20, 10])[0]
    
    # Apply home advantage
    if home_advantage and random.random() < 0.4:
        home_score = min(home_score + 1, 6)
    elif not home_advantage and random.random() < 0.3:
        away_score = min(away_score + 1, 6)
    
    # Ensure at least one goal in most matches (70% have goals)
    if random.random() < 0.3:  # 30% chance of 0-0
        home_score = 0
        away_score = 0
    
    # Update match scores and status
    match.home_score = home_score
    match.away_score = away_score
    match.status = 'finished'
    match.save()
    
    # Create scorers and assisters
    home_scorers = []
    away_scorers = []
    
    # Select goal scorers (forwards and midfielders more likely to score)
    forward_midfielders_home = [p for p in home_players if p.position in ['FW', 'MF']]
    forward_midfielders_away = [p for p in away_players if p.position in ['FW', 'MF']]
    
    # If not enough forwards/midfielders, include all players
    if len(forward_midfielders_home) < home_score:
        forward_midfielders_home = home_players
    if len(forward_midfielders_away) < away_score:
        forward_midfielders_away = away_players
    
    # Select scorers (some players can score multiple goals)
    for _ in range(home_score):
        scorer = random.choice(forward_midfielders_home)
        home_scorers.append(scorer)
    
    for _ in range(away_score):
        scorer = random.choice(forward_midfielders_away)
        away_scorers.append(scorer)
    
    # Create MatchScorer and MatchAssist entries
    for scorer in home_scorers:
        goal = MatchScorer.objects.create(
            match=match,
            player=scorer,
            team=match.home_team,
            minute=random.randint(1, 90)
        )
        
        # 60% chance of assist (not all goals have assists)
        if random.random() < 0.6:
            # Select assister (different from scorer, on same team)
            possible_assisters = [p for p in home_players if p.id != scorer.id]
            if possible_assisters:
                assister = random.choice(possible_assisters)
                MatchAssist.objects.create(
                    goal=goal,
                    match=match,
                    player=assister,
                    team=match.home_team
                )
    
    for scorer in away_scorers:
        goal = MatchScorer.objects.create(
            match=match,
            player=scorer,
            team=match.away_team,
            minute=random.randint(1, 90)
        )
        
        # 60% chance of assist
        if random.random() < 0.6:
            possible_assisters = [p for p in away_players if p.id != scorer.id]
            if possible_assisters:
                assister = random.choice(possible_assisters)
                MatchAssist.objects.create(
                    goal=goal,
                    match=match,
                    player=assister,
                    team=match.away_team
                )
    
    # Update team stats
    match.home_team.goals_for += home_score
    match.home_team.goals_against += away_score
    match.away_team.goals_for += away_score
    match.away_team.goals_against += home_score
    
    if home_score > away_score:
        match.home_team.wins += 1
        match.away_team.losses += 1
    elif away_score > home_score:
        match.away_team.wins += 1
        match.home_team.losses += 1
    else:
        match.home_team.draws += 1
        match.away_team.draws += 1
    
    match.home_team.save()
    match.away_team.save()
    
    # Update player stats (goals, assists, appearances)
    # Track which players have been updated to avoid double-counting
    updated_players = set()
    
    # Count goals per scorer (same player can score multiple goals)
    home_goal_counts = Counter([s.id for s in home_scorers])
    away_goal_counts = Counter([s.id for s in away_scorers])
    all_goal_counts = {**home_goal_counts, **away_goal_counts}
    
    # Update scorers
    for scorer_id, goal_count in all_goal_counts.items():
        try:
            scorer = Player.objects.get(id=scorer_id)
            scorer.goals += goal_count
            scorer.appearances += 1
            scorer.save()
            updated_players.add(scorer.id)
        except Player.DoesNotExist:
            continue
    
    # Update assisters
    assists = MatchAssist.objects.filter(match=match)
    for assist in assists:
        if assist.player and assist.player.id not in updated_players:
            assist.player.assists += 1
            assist.player.appearances += 1
            assist.player.save()
            updated_players.add(assist.player.id)
        elif assist.player:
            # Player already updated (scored), just add assist
            assist.player.assists += 1
            assist.player.save()
    
    # Update appearances for remaining players who played (didn't score/assist)
    # For simplicity, we'll mark a subset of remaining players as having appeared
    # This could be more sophisticated with actual lineups
    remaining_home = [p for p in home_players if p.id not in updated_players]
    remaining_away = [p for p in away_players if p.id not in updated_players]
    
    # Mark about 7-9 additional players per team as having appeared (realistic squad size)
    for player in remaining_home[:random.randint(7, 9)]:
        player.appearances += 1
        player.save()
    
    for player in remaining_away[:random.randint(7, 9)]:
        player.appearances += 1
        player.save()

