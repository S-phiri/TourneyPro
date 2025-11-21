"""
NEW: Tournament format utilities for dynamic fixture generation
Supports League, Knockout, and Combination formats without breaking existing models
"""
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from .models import Tournament, Team, Match, Registration


def generate_groups(teams: List[Team], type: str = "combinationB") -> List[Dict]:
    """
    Generate balanced groups for combinationB format (Groups → Knockout)
    
    Rules:
    - Try to create groups of 4-5 teams where possible
    - Balance group sizes (minimize size difference)
    - If 10 teams: 2 groups of 5
    - If 12 teams: 4 groups of 3 or 3 groups of 4
    - General: prefer groups of 4-5, balance remainder
    
    Returns: List of group dicts with teams assigned
    """
    if not teams:
        return []
    
    num_teams = len(teams)
    
    # Determine optimal group configuration
    if num_teams <= 4:
        # Too few teams, single group
        return [{"name": "Group A", "teams": teams}]
    elif num_teams <= 8:
        # 2 groups of 4
        mid = num_teams // 2
        return [
            {"name": "Group A", "teams": teams[:mid]},
            {"name": "Group B", "teams": teams[mid:]}
        ]
    elif num_teams == 10:
        # 2 groups of 5
        return [
            {"name": "Group A", "teams": teams[:5]},
            {"name": "Group B", "teams": teams[5:]}
        ]
    elif num_teams == 12:
        # 4 groups of 3 (more balanced for knockout)
        return [
            {"name": "Group A", "teams": teams[0:3]},
            {"name": "Group B", "teams": teams[3:6]},
            {"name": "Group C", "teams": teams[6:9]},
            {"name": "Group D", "teams": teams[9:12]}
        ]
    elif num_teams <= 16:
        # 4 groups of 4
        groups_count = 4
        per_group = num_teams // groups_count
        remainder = num_teams % groups_count
        
        groups = []
        start_idx = 0
        for i in range(groups_count):
            group_size = per_group + (1 if i < remainder else 0)
            groups.append({
                "name": f"Group {chr(65 + i)}",  # A, B, C, D
                "teams": teams[start_idx:start_idx + group_size]
            })
            start_idx += group_size
        return groups
    else:
        # For larger tournaments, use 4-5 teams per group
        ideal_group_size = 4 if num_teams % 4 == 0 else 5
        num_groups = (num_teams + ideal_group_size - 1) // ideal_group_size  # Ceiling division
        
        groups = []
        start_idx = 0
        for i in range(num_groups):
            group_size = min(ideal_group_size, num_teams - start_idx)
            groups.append({
                "name": f"Group {chr(65 + i)}",  # A, B, C, D, ...
                "teams": teams[start_idx:start_idx + group_size]
            })
            start_idx += group_size
        return groups


def generate_league_fixtures(teams: List[Team], tournament: Tournament, start_date: datetime) -> List[Match]:
    """
    Generate round-robin league fixtures (everyone plays everyone once)
    Organized into rounds where each team plays one game per round
    For n teams: (n-1) rounds, each round has n/2 games
    
    Returns list of Match objects (not saved - caller should save)
    """
    matches = []
    num_teams = len(teams)
    
    if num_teams < 2:
        return matches
    
    # Round-robin algorithm: organize matches into rounds
    # Each round: all teams play one game (n/2 games per round)
    # Total rounds: (n-1) rounds for n teams
    
    # Create list of all matchups (team i vs team j, where i < j)
    matchups = []
    for i in range(num_teams):
        for j in range(i + 1, num_teams):
            matchups.append((teams[i], teams[j]))
    
    # Organize matchups into rounds
    # Simple algorithm: distribute matchups across rounds
    num_rounds = num_teams - 1  # Standard round-robin
    matches_per_round = num_teams // 2
    
    current_date = start_date
    
    # Round-robin scheduling: rotate teams to ensure each team plays once per round
    # Use a simple rotation algorithm
    rounds = []
    if num_teams % 2 == 0:  # Even number of teams
        # Standard round-robin rotation
        fixed = teams[0]  # Fix first team
        rotating = teams[1:]
        
        for round_num in range(num_rounds):
            round_matches = []
            # Fixed team plays against rotating[0]
            round_matches.append((fixed, rotating[0]))
            
            # Pair remaining teams
            for i in range(1, len(rotating) // 2 + 1):
                round_matches.append((rotating[i], rotating[len(rotating) - i]))
            
            rounds.append(round_matches)
            # Rotate the list (keep first, rotate rest)
            rotating = [rotating[0]] + [rotating[-1]] + rotating[1:-1]
    else:  # Odd number of teams
        # Add a "bye" team (can be None or a placeholder)
        teams_with_bye = teams + [None]
        fixed = teams_with_bye[0]
        rotating = teams_with_bye[1:]
        
        for round_num in range(num_rounds + 1):  # One extra round for bye
            round_matches = []
            # Fixed team plays against rotating[0] (or gets bye if None)
            if rotating[0] is not None:
                round_matches.append((fixed, rotating[0]))
            
            # Pair remaining teams
            for i in range(1, len(rotating) // 2 + 1):
                if rotating[i] is not None and rotating[len(rotating) - i] is not None:
                    round_matches.append((rotating[i], rotating[len(rotating) - i]))
            
            if round_matches:  # Only add non-empty rounds
                rounds.append(round_matches)
            # Rotate the list
            rotating = [rotating[0]] + [rotating[-1]] + rotating[1:-1]
    
    # Create match objects organized by round
    for round_num, round_matches in enumerate(rounds):
        round_date = start_date + timedelta(days=round_num)
        
        for home_team, away_team in round_matches:
            match = Match(
                tournament=tournament,
                home_team=home_team,
                away_team=away_team,
                kickoff_at=round_date,
                status='scheduled'
            )
            matches.append(match)
    
    return matches


def is_power_of_2(n):
    """Check if a number is a power of 2"""
    return n > 0 and (n & (n - 1)) == 0

def generate_knockout_fixtures(teams: List[Team], tournament: Tournament, start_date: datetime) -> List[Match]:
    """
    Generate single-elimination knockout fixtures (bracket style)
    For knockout: generates first round only (subsequent rounds generated after each round completes)
    - Round 1: n/2 matches (n teams) for power-of-2 numbers
    - Total matches for full tournament = n - 1 (for n teams)
    - But we only generate Round 1 here, subsequent rounds are created dynamically
    
    Returns list of Match objects (not saved - caller should save)
    """
    matches = []
    num_teams = len(teams)
    
    if num_teams < 2:
        return matches
    
    # Validate: knockout brackets must be power-of-2
    if not is_power_of_2(num_teams):
        valid_sizes = [4, 8, 16, 32, 64]
        raise ValueError(
            f'Knockout tournament must have a power-of-2 number of teams. '
            f'Got {num_teams} teams. Valid sizes: {valid_sizes}. '
            f'Please adjust team count or use a different format.'
        )
    
    # Validate: ensure we're not accidentally generating league fixtures
    # For knockout, max matches in first round should be num_teams // 2
    max_first_round_matches = num_teams // 2
    
    # For knockout, only generate the first round
    # Since we only allow power-of-2, all teams play (no byes needed)
    num_matches_round1 = num_teams // 2
    
    # Pair teams for first round
    for i in range(num_matches_round1):
        home_team = teams[i * 2]
        away_team = teams[i * 2 + 1]
        
        match = Match(
            tournament=tournament,
            home_team=home_team,
            away_team=away_team,
            kickoff_at=start_date,
            status='scheduled',
            pitch="Round 1"  # Use pitch field to track round
        )
        matches.append(match)
    
    # Validation: ensure we didn't generate too many matches
    if len(matches) > max_first_round_matches:
        raise ValueError(
            f"Knockout fixture generation error: Generated {len(matches)} matches for {num_teams} teams. "
            f"Expected maximum {max_first_round_matches} matches in first round."
        )
    
    # Note: Subsequent rounds should be generated after Round 1 completes
    # This ensures we know which teams actually advanced
    # For a 10-team knockout: Round 1 = 5 matches, Round 2 = 2-3 matches, etc.
    # Total = 9 matches (10 - 1)
    
    return matches


def generate_combination_fixtures(
    teams: List[Team], 
    tournament: Tournament, 
    start_date: datetime,
    combination_type: str = "combinationA"
) -> List[Match]:
    """
    Generate fixtures for combination format
    - combinationA: League → Knockout (all teams in one league, top X qualify)
    - combinationB: Groups → Knockout (groups play round-robin, top 2 from each advance)
    
    Returns list of Match objects (not saved - caller should save)
    """
    matches = []
    current_date = start_date
    
    if combination_type == "combinationA":
        # League stage: all teams play round-robin
        league_matches = generate_league_fixtures(teams, tournament, current_date)
        matches.extend(league_matches)
        
        # Calculate how many days league stage takes
        num_league_days = len(league_matches) // max(1, len(teams) // 2)
        current_date += timedelta(days=num_league_days + 1)  # +1 day gap
        
        # Knockout stage: top teams qualify (determined after league)
        # For now, we'll create placeholder knockout matches
        # Top 4, 8, or 16 qualify (depending on team count)
        qualify_count = min(8, len(teams))  # Top 8 qualify by default
        if len(teams) <= 4:
            qualify_count = 4
        elif len(teams) <= 8:
            qualify_count = 4
        
        # Create knockout bracket for qualifiers
        # Note: Actual teams will be determined after league stage completes
        # This is a placeholder structure
        knockout_teams = teams[:qualify_count]  # Placeholder
        knockout_matches = generate_knockout_fixtures(knockout_teams, tournament, current_date)
        matches.extend(knockout_matches)
        
    elif combination_type == "combinationB":
        # Champions League format: Groups → Knockout
        # Group stage: teams divided into groups, play round-robin (home & away)
        # Only generate GROUP STAGE matches here (not knockout - those are created after group stage)
        groups = generate_groups(teams, "combinationB")
        
        # Champions League format: Each team plays 6 matches in 6 rounds (for 4-team groups)
        # Round 1-6: Each round has one match per team
        # For 4 teams in a group: Round 1 = 2 matches, Round 2 = 2 matches, etc.
        group_size = len(groups[0]["teams"]) if groups else 4
        num_rounds = (group_size - 1) * 2  # Home and away for each pairing
        
        # Generate matches round by round (like Champions League)
        for round_num in range(1, num_rounds + 1):
            round_date = start_date + timedelta(days=round_num - 1)
            
            # Generate matches for all groups in this round
            for group in groups:
                group_teams = group["teams"]
                group_name = group["name"]
                
                # Rotate teams to ensure each round has different pairings
                # This is a simplified rotation - for true Champions League, use specific pairings
                if round_num == 1:
                    # Round 1: Team 1 vs Team 2, Team 3 vs Team 4
                    pairings = [
                        (group_teams[0], group_teams[1]),
                        (group_teams[2], group_teams[3]) if len(group_teams) >= 4 else None
                    ]
                elif round_num == 2:
                    # Round 2: Team 1 vs Team 3, Team 2 vs Team 4
                    pairings = [
                        (group_teams[0], group_teams[2]),
                        (group_teams[1], group_teams[3]) if len(group_teams) >= 4 else None
                    ]
                elif round_num == 3:
                    # Round 3: Team 1 vs Team 4, Team 2 vs Team 3
                    pairings = [
                        (group_teams[0], group_teams[3]) if len(group_teams) >= 4 else None,
                        (group_teams[1], group_teams[2])
                    ]
                elif round_num == 4:
                    # Round 4: Reverse of Round 1 (away/home)
                    pairings = [
                        (group_teams[1], group_teams[0]),
                        (group_teams[3], group_teams[2]) if len(group_teams) >= 4 else None
                    ]
                elif round_num == 5:
                    # Round 5: Reverse of Round 2
                    pairings = [
                        (group_teams[2], group_teams[0]),
                        (group_teams[3], group_teams[1]) if len(group_teams) >= 4 else None
                    ]
                elif round_num == 6:
                    # Round 6: Reverse of Round 3
                    pairings = [
                        (group_teams[3], group_teams[0]) if len(group_teams) >= 4 else None,
                        (group_teams[2], group_teams[1])
                    ]
                else:
                    # For groups with more/less teams, use rotation
                    pairings = []
                    for i in range(0, len(group_teams) - 1, 2):
                        if i + 1 < len(group_teams):
                            pairings.append((group_teams[i], group_teams[i + 1]))
                
                # Create matches for this round in this group
                for pairing in pairings:
                    if pairing and pairing[0] and pairing[1]:
                        home_team, away_team = pairing
                        match = Match(
                            tournament=tournament,
                            home_team=home_team,
                            away_team=away_team,
                            kickoff_at=round_date,
                            status='scheduled',
                            pitch=f"{group_name} - Round {round_num}"  # Track group and round
                        )
                        matches.append(match)
        
        # NOTE: Knockout matches are NOT generated here
        # They will be generated dynamically after group stage completes
        # This happens in simulation_helpers.py when group stage finishes
    
    return matches


def assign_referees_to_matches(matches: List[Match], tournament: Tournament):
    """Auto-assign referees to matches when fixtures are generated"""
    from .models import Referee, MatchReferee
    
    # Get active referees (can filter by tournament/venue if needed)
    referees = list(Referee.objects.filter(is_active=True))
    
    if not referees:
        return  # No referees available
    
    # Round-robin assignment: distribute matches evenly among referees
    for i, match in enumerate(matches):
        referee = referees[i % len(referees)]
        MatchReferee.objects.create(
            match=match,
            referee=referee,
            is_primary=True
        )

def generate_fixtures_for_tournament(tournament: Tournament) -> List[Match]:
    """
    Main entry point: Generate fixtures based on tournament format
    Returns list of Match objects (caller should save them)
    """
    # Get registered teams
    registrations = Registration.objects.filter(
        tournament=tournament,
        status__in=['pending', 'paid']
    ).select_related('team')
    
    teams = [reg.team for reg in registrations]
    num_teams = len(teams)
    
    if num_teams < 2:
        return []  # Need at least 2 teams
    
    # Determine start date
    start_date = timezone.make_aware(
        datetime.combine(tournament.start_date, datetime.min.time())
    )
    
    # Get combination sub-type from structure JSON
    structure = tournament.structure or {}
    combination_type = structure.get('combination_type', 'combinationA')
    
    # Generate fixtures based on format
    if tournament.format == "league":
        matches = generate_league_fixtures(teams, tournament, start_date)
        # Validation: For league with n teams, should have n*(n-1)/2 total matches
        expected_matches = num_teams * (num_teams - 1) // 2
        if len(matches) != expected_matches:
            raise ValueError(
                f"League fixture generation error: Generated {len(matches)} matches for {num_teams} teams. "
                f"Expected {expected_matches} matches (n*(n-1)/2)."
            )
        # Auto-assign referees to matches
        assign_referees_to_matches(matches, tournament)
        return matches
    elif tournament.format == "knockout":
        matches = generate_knockout_fixtures(teams, tournament, start_date)
        # Validation: For knockout with n teams, first round should have n/2 matches (or (n-1)/2 for odd)
        expected_first_round = num_teams // 2 if num_teams % 2 == 0 else (num_teams - 1) // 2
        if len(matches) != expected_first_round:
            raise ValueError(
                f"Knockout fixture generation error: Generated {len(matches)} matches for {num_teams} teams. "
                f"Expected {expected_first_round} matches in first round. "
                f"Tournament format is '{tournament.format}'. "
                f"Number of registered teams: {num_teams}."
            )
        # Auto-assign referees to matches
        assign_referees_to_matches(matches, tournament)
        return matches
    elif tournament.format == "combination":
        matches = generate_combination_fixtures(teams, tournament, start_date, combination_type)
        # Auto-assign referees to matches
        assign_referees_to_matches(matches, tournament)
        return matches
    else:
        # Default to league (but log warning)
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Unknown tournament format '{tournament.format}', defaulting to league")
        matches = generate_league_fixtures(teams, tournament, start_date)
        # Auto-assign referees to matches
        assign_referees_to_matches(matches, tournament)
        return matches


def calculate_group_standings(teams: List[Team], matches: List[Match], group_name: str) -> List[Dict]:
    """
    Calculate standings for a specific group (for combinationB format)
    Returns sorted list of team standings dicts
    """
    # Filter matches for this group (stored in pitch field)
    group_matches = [m for m in matches if m.pitch == group_name and m.status == 'finished']
    
    # Initialize standings for each team
    standings = {}
    for team in teams:
        standings[team.id] = {
            'team': team,
            'played': 0,
            'wins': 0,
            'draws': 0,
            'losses': 0,
            'goals_for': 0,
            'goals_against': 0,
            'goal_difference': 0,
            'points': 0
        }
    
    # Process matches
    for match in group_matches:
        home_team_id = match.home_team.id
        away_team_id = match.away_team.id
        
        home_score = match.home_score or 0
        away_score = match.away_score or 0
        
        # Update home team
        standings[home_team_id]['played'] += 1
        standings[home_team_id]['goals_for'] += home_score
        standings[home_team_id]['goals_against'] += away_score
        
        # Update away team
        standings[away_team_id]['played'] += 1
        standings[away_team_id]['goals_for'] += away_score
        standings[away_team_id]['goals_against'] += home_score
        
        # Determine result
        if home_score > away_score:
            standings[home_team_id]['wins'] += 1
            standings[home_team_id]['points'] += 3
            standings[away_team_id]['losses'] += 1
        elif away_score > home_score:
            standings[away_team_id]['wins'] += 1
            standings[away_team_id]['points'] += 3
            standings[home_team_id]['losses'] += 1
        else:
            standings[home_team_id]['draws'] += 1
            standings[home_team_id]['points'] += 1
            standings[away_team_id]['draws'] += 1
            standings[away_team_id]['points'] += 1
    
    # Calculate goal difference
    for team_id in standings:
        standings[team_id]['goal_difference'] = (
            standings[team_id]['goals_for'] - standings[team_id]['goals_against']
        )
    
    # Sort by points, then goal difference, then goals for
    sorted_standings = sorted(
        standings.values(),
        key=lambda x: (x['points'], x['goal_difference'], x['goals_for']),
        reverse=True
    )
    
    return sorted_standings

