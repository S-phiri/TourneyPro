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
    - 2 groups for tournaments with less than 16 teams (12-15 teams)
    - 4 groups for tournaments with 16 or more teams
    - Balance group sizes (minimize size difference)
    
    Examples:
    - 12 teams: 2 groups of 6 (6+6)
    - 13 teams: 2 groups of 6+7 (6+7)
    - 14 teams: 2 groups of 7+7 (7+7)
    - 15 teams: 2 groups of 7+8 (7+8)
    - 16 teams: 4 groups of 4 (4+4+4+4)
    
    Returns: List of group dicts with teams assigned
    """
    if not teams:
        return []
    
    num_teams = len(teams)
    
    # Determine group configuration
    if num_teams < 16:
        # 2 groups for tournaments with less than 16 teams
        groups_count = 2
    else:
        # 4 groups for tournaments with 16 or more teams
        groups_count = 4
    
    # Distribute teams evenly across groups
    # This ensures groups are as balanced as possible
    per_group = num_teams // groups_count
    remainder = num_teams % groups_count
    
    groups = []
    start_idx = 0
    for i in range(groups_count):
        # First 'remainder' groups get one extra team
        group_size = per_group + (1 if i < remainder else 0)
        groups.append({
            "name": f"Group {chr(65 + i)}",  # A, B, C, D
            "teams": teams[start_idx:start_idx + group_size]
        })
        start_idx += group_size
    
    return groups


def generate_round_robin_for_group(group_teams: List[Team], tournament: Tournament, group_name: str, start_date: datetime, start_round: int = 1) -> List[Tuple[int, Match]]:
    """
    Generate round-robin matches for a single group using itertools.combinations.
    This guarantees every team plays every other team exactly once (no duplicates).
    
    Returns list of tuples: (round_number, match)
    Each team plays every other team exactly once.
    
    Args:
        group_teams: List of teams in this group
        tournament: Tournament instance
        group_name: Name of the group (e.g., "Group A")
        start_date: Start date for first round
        start_round: Starting round number (default: 1)
    
    Returns:
        List of (round_number, Match) tuples
    
    Guarantees:
        - 6 teams → 15 matches (6 choose 2 = 15)
        - 7 teams → 21 matches (7 choose 2 = 21)
        - No duplicates even if called multiple times
    """
    from itertools import combinations
    
    matches = []
    num_teams = len(group_teams)
    
    if num_teams < 2:
        return matches
    
    # Check for existing matches to avoid duplicates
    existing_matches = Match.objects.filter(
        tournament=tournament,
        pitch__startswith=group_name
    )
    
    # Track existing pairs
    existing_pairs = set()
    for m in existing_matches:
        pair = tuple(sorted([m.home_team.id, m.away_team.id]))
        existing_pairs.add(pair)
    
    # Generate all unique pairs using combinations
    all_pairs = []
    for team1, team2 in combinations(group_teams, 2):
        pair_key = tuple(sorted([team1.id, team2.id]))
        if pair_key not in existing_pairs:
            all_pairs.append((team1, team2))
    
    # Expected number of matches: n * (n-1) / 2
    expected_matches = (num_teams * (num_teams - 1)) // 2
    
    if len(existing_pairs) == expected_matches:
        print(f"  ✓ {group_name}: All {expected_matches} matches already exist, skipping generation")
        # Return existing matches organized by round
        existing_list = list(existing_matches)
        # Group by round number extracted from pitch
        from collections import defaultdict
        by_round = defaultdict(list)
        for m in existing_list:
            # Extract round number from pitch (e.g., "Group A - Round 3" -> 3)
            if m.pitch:
                try:
                    round_str = m.pitch.split('Round ')[-1]
                    round_num = int(round_str)
                    by_round[round_num].append(m)
                except (ValueError, IndexError):
                    by_round[start_round].append(m)
            else:
                by_round[start_round].append(m)
        
        # Convert to (round_number, match) tuples
        result = []
        for round_num, round_matches in sorted(by_round.items()):
            for match in round_matches:
                result.append((round_num, match))
        return result
    
    # Organize pairs into rounds for scheduling
    # Each round should have roughly the same number of matches
    num_rounds = max(1, num_teams - 1)  # Standard: n-1 rounds for n teams
    matches_per_round = max(1, len(all_pairs) // num_rounds)
    if len(all_pairs) % num_rounds != 0:
        matches_per_round += 1  # Distribute remainder
    
    # Distribute pairs across rounds
    rounds = [[] for _ in range(num_rounds)]
    round_teams = [set() for _ in range(num_rounds)]  # Track teams used in each round
    
    # Simple greedy assignment: assign each pair to first available round
    for team1, team2 in all_pairs:
        assigned = False
        for round_idx in range(num_rounds):
            if team1.id not in round_teams[round_idx] and team2.id not in round_teams[round_idx]:
                rounds[round_idx].append((team1, team2))
                round_teams[round_idx].add(team1.id)
                round_teams[round_idx].add(team2.id)
                assigned = True
                break
        
        # If no perfect round found, assign to round with fewest matches
        if not assigned:
            round_idx = min(range(num_rounds), key=lambda i: len(rounds[i]))
            rounds[round_idx].append((team1, team2))
    
    # Create match objects organized by round
    created_count = 0
    for round_idx, round_pairs in enumerate(rounds):
        if not round_pairs:  # Skip empty rounds
            continue
        
        round_number = start_round + round_idx
        round_date = start_date + timedelta(days=round_idx)
        
        for team1, team2 in round_pairs:
            match = Match(
                tournament=tournament,
                home_team=team1,
                away_team=team2,
                kickoff_at=round_date,
                status='scheduled',
                pitch=f"{group_name} - Round {round_number}"
            )
            matches.append((round_number, match))
            created_count += 1
    
    # Validate completeness
    pairs_created = set()
    for _, match in matches:
        home_id = match.home_team.id
        away_id = match.away_team.id
        pair = tuple(sorted([home_id, away_id]))
        pairs_created.add(pair)
    
    total_pairs = len(existing_pairs) + len(pairs_created)
    
    if total_pairs == expected_matches:
        print(f"  ✓ {group_name}: {created_count} new matches created, total {total_pairs}/{expected_matches} matches")
    else:
        print(f"  WARNING: {group_name}: Created {created_count} matches, but total is {total_pairs}/{expected_matches}")
    
    return matches


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
    else:  # Odd number of teams - use proper round-robin with bye rotation
        # For odd n teams: n-1 rounds, each team plays n-1 matches (once against each other)
        # In each round: (n-1)/2 matches are played, 1 team gets a bye
        # Use circle method: fix one team, rotate others around it
        fixed = teams[0]  # Fix first team
        rotating = teams[1:]  # Teams that will rotate
        
        for round_num in range(num_rounds):  # Exactly num_rounds rounds (num_teams - 1)
            round_matches = []
            
            # Pair fixed team with first rotating team
            round_matches.append((fixed, rotating[0]))
            
            # Pair remaining rotating teams (they form pairs naturally)
            # For n-1 rotating teams (even number), pair them up
            for i in range(1, len(rotating) // 2 + 1):
                team1_idx = i
                team2_idx = len(rotating) - i
                if team1_idx < team2_idx:
                    round_matches.append((rotating[team1_idx], rotating[team2_idx]))
            
            rounds.append(round_matches)
            
            # Rotate: move first to end, shift others left
            rotating = rotating[1:] + [rotating[0]]
    
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
        # World Cup format: Groups → Knockout
        # Group stage: teams divided into groups, play single round-robin (each team plays each other once)
        # Only generate GROUP STAGE matches here (not knockout - those are created after group stage)
        groups = generate_groups(teams, "combinationB")
        
        # Find the maximum number of rounds needed
        # For even team counts: group_size - 1 rounds
        # For odd team counts: group_size rounds (due to bye logic)
        max_rounds = 0
        group_round_info = []
        for group in groups:
            group_size = len(group["teams"])
            group_name = group["name"]
            # Calculate rounds needed for this group
            if group_size % 2 == 0:
                # Even: group_size - 1 rounds
                rounds_needed = group_size - 1
            else:
                # Odd: group_size rounds (handles bye)
                rounds_needed = group_size
            max_rounds = max(max_rounds, rounds_needed)
            group_round_info.append((group_name, group_size, rounds_needed))
        
        # Log group round information for debugging
        print(f"  Group configuration for {len(teams)} teams:")
        for group_name, group_size, rounds_needed in group_round_info:
            print(f"    {group_name}: {group_size} teams → {rounds_needed} rounds")
        print(f"  Maximum rounds needed: {max_rounds}")
        
        # Generate all round-robin matches for each group first
        all_group_matches = {}  # {group_name: [(round_num, match), ...]}
        for group in groups:
            group_teams = group["teams"]
            group_name = group["name"]
            # Generate matches with temporary dates (will be fixed by round number)
            group_matches = generate_round_robin_for_group(
                group_teams, 
                tournament, 
                group_name, 
                start_date, 
                start_round=1
            )
            all_group_matches[group_name] = group_matches
        
        # Organize matches by round number (all groups play same round on same day)
        # Round 1 = day 0, Round 2 = day 1, etc.
        # Note: Some groups may finish earlier than others (e.g., 7-team group finishes before 8-team group)
        # That's okay - we only create matches that exist for each round
        for round_num in range(1, max_rounds + 1):
            round_date = start_date + timedelta(days=round_num - 1)
            
            # Collect all matches for this round from all groups
            matches_in_this_round = 0
            for group_name, group_matches in all_group_matches.items():
                for match_round_num, match in group_matches:
                    if match_round_num == round_num:
                        # Update date to match the round date (all groups play same round on same day)
                        match.kickoff_at = round_date
                        matches.append(match)
                        matches_in_this_round += 1
            
            # Log round organization for debugging
            if matches_in_this_round > 0:
                groups_in_round = []
                for group in groups:
                    group_name = group['name']
                    if any((r == round_num for r, m in all_group_matches.get(group_name, []))):
                        groups_in_round.append(group_name)
                print(f"  Round {round_num}: {matches_in_this_round} matches from {len(groups_in_round)} groups ({', '.join(groups_in_round)})")
        
        # NOTE: Knockout matches are NOT generated here
        # They will be generated dynamically after group stage completes
        # This happens in simulation_helpers.py when group stage finishes
        
        # Validate round-robin completeness for each group
        print(f"\n{'='*60}")
        print(f"Validating round-robin fixture completeness...")
        for group in groups:
            group_name = group['name']
            group_teams = group['teams']
            validation_result = validate_round_robin_completeness(group_teams, matches, group_name)
            
            if validation_result['valid']:
                print(f"  ✓ {group_name}: Valid - {validation_result['actual_matches']}/{validation_result['expected_matches']} matches, {validation_result['total_teams']} teams")
            else:
                print(f"  ✗ {group_name}: INVALID - {validation_result['actual_matches']}/{validation_result['expected_matches']} matches")
                for error in validation_result['errors']:
                    print(f"    ERROR: {error}")
                for warning in validation_result['warnings']:
                    print(f"    WARNING: {warning}")
            
            # Log matches per team
            print(f"    Matches per team:")
            for team in group_teams:
                count = validation_result['matches_per_team'].get(team.id, 0)
                expected = validation_result['expected_per_team']
                status = "✓" if count == expected else "✗"
                print(f"      {status} {team.name}: {count}/{expected}")
        print(f"{'='*60}\n")
    
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
    
    Important: The "played" column counts ALL scheduled matches for the team,
    while wins/draws/losses/goals only count from FINISHED matches.
    This ensures all teams show the same total games (if fixtures are complete).
    """
    # Filter matches for this group (pitch field format: "Group A - Round 1", "Group A - Round 2", etc.)
    # Include ALL matches (scheduled and finished) for counting total games played
    all_group_matches = [m for m in matches if m.pitch and m.pitch.startswith(group_name)]
    # Only finished matches are used for stats (wins, draws, losses, goals)
    finished_group_matches = [m for m in all_group_matches if m.status == 'finished']
    
    # Initialize standings for each team
    standings = {}
    for team in teams:
        standings[team.id] = {
            'team': team,
            'played': 0,  # Will count ALL scheduled matches
            'wins': 0,
            'draws': 0,
            'losses': 0,
            'goals_for': 0,
            'goals_against': 0,
            'goal_difference': 0,
            'points': 0
        }
    
    # Count total scheduled matches per team (for "played" column)
    # This ensures all teams show the same number of games if fixtures are complete
    for match in all_group_matches:
        home_team_id = match.home_team.id
        away_team_id = match.away_team.id
        
        # Count all matches (scheduled or finished) for "played" column
        if home_team_id in standings:
            standings[home_team_id]['played'] += 1
        if away_team_id in standings:
            standings[away_team_id]['played'] += 1
    
    # Process ONLY finished matches for stats (wins, draws, losses, goals, points)
    for match in finished_group_matches:
        home_team_id = match.home_team.id
        away_team_id = match.away_team.id
        
        home_score = match.home_score or 0
        away_score = match.away_score or 0
        
        # Update goals (only for finished matches)
        if home_team_id in standings:
            standings[home_team_id]['goals_for'] += home_score
            standings[home_team_id]['goals_against'] += away_score
        if away_team_id in standings:
            standings[away_team_id]['goals_for'] += away_score
            standings[away_team_id]['goals_against'] += home_score
        
        # Determine result (only for finished matches)
        if home_score > away_score:
            if home_team_id in standings:
                standings[home_team_id]['wins'] += 1
                standings[home_team_id]['points'] += 3
            if away_team_id in standings:
                standings[away_team_id]['losses'] += 1
        elif away_score > home_score:
            if away_team_id in standings:
                standings[away_team_id]['wins'] += 1
                standings[away_team_id]['points'] += 3
            if home_team_id in standings:
                standings[home_team_id]['losses'] += 1
        else:
            if home_team_id in standings:
                standings[home_team_id]['draws'] += 1
                standings[home_team_id]['points'] += 1
            if away_team_id in standings:
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


def validate_round_robin_completeness(group_teams: List[Team], matches: List[Match], group_name: str) -> Dict:
    """
    Validate that round-robin fixtures are complete - every team plays every other team exactly once.
    
    Args:
        group_teams: List of teams in the group
        matches: List of Match objects for this group
        group_name: Name of the group (e.g., "Group A")
    
    Returns:
        Dict with validation results:
        {
            'valid': bool,
            'total_teams': int,
            'expected_matches': int,
            'actual_matches': int,
            'matches_per_team': dict,  # {team_id: count}
            'missing_pairs': list,  # [(team1, team2), ...]
            'duplicate_pairs': list,  # [(team1, team2), ...]
            'errors': list,
            'warnings': list
        }
    """
    num_teams = len(group_teams)
    team_ids = {team.id for team in group_teams}
    
    # Expected number of matches: n*(n-1)/2 (each team plays every other team once)
    expected_matches = (num_teams * (num_teams - 1)) // 2
    
    # Filter matches for this group
    group_matches = []
    for match in matches:
        if match.pitch and match.pitch.startswith(group_name):
            # Verify both teams are in the group
            if match.home_team_id in team_ids and match.away_team_id in team_ids:
                group_matches.append(match)
    
    actual_matches = len(group_matches)
    
    # Track matches per team
    matches_per_team = {team_id: 0 for team_id in team_ids}
    
    # Track all pairs (normalize: always put smaller ID first)
    pairs_seen = {}
    duplicate_pairs = []
    
    for match in group_matches:
        home_id = match.home_team_id
        away_id = match.away_team_id
        
        # Count matches per team
        matches_per_team[home_id] += 1
        matches_per_team[away_id] += 1
        
        # Normalize pair (smaller ID first)
        pair = tuple(sorted([home_id, away_id]))
        
        if pair in pairs_seen:
            duplicate_pairs.append(pair)
            pairs_seen[pair] += 1
        else:
            pairs_seen[pair] = 1
    
    # Find missing pairs
    missing_pairs = []
    for i, team1 in enumerate(group_teams):
        for team2 in group_teams[i+1:]:
            pair = tuple(sorted([team1.id, team2.id]))
            if pair not in pairs_seen:
                missing_pairs.append((team1.name, team2.name))
    
    # Expected matches per team (accounting for byes in odd-numbered groups)
    if num_teams % 2 == 0:
        expected_per_team = num_teams - 1  # Even: each team plays (n-1) matches
    else:
        expected_per_team = num_teams - 1  # Odd: each team plays (n-1) matches (one team gets bye each round)
    
    # Check for teams with wrong number of matches
    errors = []
    warnings = []
    
    if actual_matches != expected_matches:
        errors.append(f"Match count mismatch: Expected {expected_matches} matches, found {actual_matches}")
    
    if missing_pairs:
        errors.append(f"Missing {len(missing_pairs)} match pairs: {missing_pairs[:5]}{'...' if len(missing_pairs) > 5 else ''}")
    
    if duplicate_pairs:
        errors.append(f"Found {len(duplicate_pairs)} duplicate match pairs: {duplicate_pairs[:5]}{'...' if len(duplicate_pairs) > 5 else ''}")
    
    # Check matches per team
    for team in group_teams:
        actual_count = matches_per_team.get(team.id, 0)
        if actual_count != expected_per_team:
            errors.append(f"Team '{team.name}' has {actual_count} matches, expected {expected_per_team}")
    
    # Warnings for teams with slightly off counts (might be in progress)
    for team in group_teams:
        actual_count = matches_per_team.get(team.id, 0)
        if actual_count < expected_per_team - 1:  # More than 1 match short
            warnings.append(f"Team '{team.name}' has {actual_count} matches (expected {expected_per_team}) - may be incomplete")
    
    is_valid = len(errors) == 0
    
    return {
        'valid': is_valid,
        'total_teams': num_teams,
        'expected_matches': expected_matches,
        'actual_matches': actual_matches,
        'expected_per_team': expected_per_team,
        'matches_per_team': matches_per_team,
        'missing_pairs': missing_pairs,
        'duplicate_pairs': duplicate_pairs,
        'errors': errors,
        'warnings': warnings
    }

