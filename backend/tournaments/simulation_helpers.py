"""
Helper functions for simulating tournament matches round by round
"""
from django.db import transaction
from django.db.utils import OperationalError
from django.utils import timezone
from datetime import timedelta
from tournaments.models import Match, Player, TeamPlayer, MatchScorer, MatchAssist, Team
from collections import Counter
import random
import re
import time


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
    
    # Check if this is combinationB format (Groups → Knockout)
    is_combinationB = False
    if tournament.format == 'combination':
        structure = tournament.structure or {}
        combination_type = structure.get('combination_type', 'combinationA')
        if combination_type == 'combinationB':
            is_combinationB = True
    
    # For combinationB format, parse pitch field to get round numbers
    if is_combinationB:
        matches_by_round = {}
        matches_without_pitch = []
        matches_without_round = []
        
        print(f"  Processing {len(scheduled_matches)} scheduled matches for combinationB format...")
        
        for match in scheduled_matches:
            # Parse pitch field: "Group A - Round 1" → round 1
            round_num = None
            if match.pitch:
                # Try to extract round number from pitch field
                match_obj = re.search(r'Round\s+(\d+)', match.pitch, re.IGNORECASE)
                if match_obj:
                    round_num = int(match_obj.group(1))
                else:
                    # Match has pitch but no round number
                    matches_without_round.append((match.id, match.pitch))
                    # Try to use date as fallback
                    if match.kickoff_at:
                        # Group by date - first date = round 1, second date = round 2, etc.
                        dates = sorted(set(m.kickoff_at.date() for m in scheduled_matches if m.kickoff_at))
                        if dates and match.kickoff_at.date() in dates:
                            round_num = dates.index(match.kickoff_at.date()) + 1
                        else:
                            round_num = 1
                    else:
                        round_num = 1
            else:
                # Match has no pitch field
                matches_without_pitch.append((match.id, match.kickoff_at))
                # Fallback to date-based grouping
                if match.kickoff_at:
                    dates = sorted(set(m.kickoff_at.date() for m in scheduled_matches if m.kickoff_at))
                    if dates and match.kickoff_at.date() in dates:
                        round_num = dates.index(match.kickoff_at.date()) + 1
                    else:
                        round_num = 1
                else:
                    round_num = 1
            
            if round_num is None:
                round_num = 1  # Final fallback
            
            if round_num not in matches_by_round:
                matches_by_round[round_num] = []
            matches_by_round[round_num].append(match)
        
        # Log warnings for matches without proper pitch/round info
        if matches_without_pitch:
            print(f"  Warning: {len(matches_without_pitch)} matches have no pitch field (using date fallback)")
        if matches_without_round:
            print(f"  Warning: {len(matches_without_round)} matches have pitch but no round number:")
            for match_id, pitch in matches_without_round[:3]:  # Show first 3
                print(f"    Match {match_id}: pitch='{pitch}'")
        
        if not matches_by_round:
            return (None, [], False)
        
        # Get all finished matches to check which rounds are complete
        finished_matches = Match.objects.filter(
            tournament=tournament,
            status='finished'
        )
        
        # Build a map of round numbers to their total match count (finished + scheduled)
        round_totals = {}  # {round_num: {'total': count, 'finished': count, 'scheduled': count}}
        
        # Count finished matches per round
        for match in finished_matches:
            if match.pitch:
                match_obj = re.search(r'Round\s+(\d+)', match.pitch, re.IGNORECASE)
                if match_obj:
                    round_num = int(match_obj.group(1))
                    if round_num not in round_totals:
                        round_totals[round_num] = {'total': 0, 'finished': 0, 'scheduled': 0}
                    round_totals[round_num]['finished'] += 1
        
        # Count scheduled matches per round and validate totals
        for round_num, matches in matches_by_round.items():
            if round_num not in round_totals:
                round_totals[round_num] = {'total': 0, 'finished': 0, 'scheduled': 0}
            round_totals[round_num]['scheduled'] = len(matches)
            round_totals[round_num]['total'] = round_totals[round_num]['finished'] + round_totals[round_num]['scheduled']
        
        # Debug: Log all rounds found
        print(f"  Debug: Rounds found in scheduled matches: {sorted(matches_by_round.keys())}")
        total_scheduled = 0
        for round_num in sorted(matches_by_round.keys()):
            matches_count = len(matches_by_round[round_num])
            finished_count = round_totals.get(round_num, {}).get('finished', 0)
            total_count = round_totals.get(round_num, {}).get('total', matches_count + finished_count)
            total_scheduled += matches_count
            print(f"    Round {round_num}: {matches_count} scheduled, {finished_count} finished, {total_count} total expected")
        
        print(f"  Total scheduled matches: {total_scheduled} (out of {len(scheduled_matches)} total scheduled)")
        
        # Find the earliest incomplete round (has scheduled matches)
        # A round is incomplete if it has scheduled matches
        incomplete_rounds = [r for r in matches_by_round.keys() if len(matches_by_round[r]) > 0]
        
        if not incomplete_rounds:
            return (None, [], False)
        
        # Get the earliest incomplete round
        earliest_round = min(incomplete_rounds)
        round_matches = matches_by_round[earliest_round]
        
        # Validate: Ensure we're only returning matches for the current round
        # Filter out any matches that don't belong to this round (safety check)
        validated_matches = []
        invalid_rounds = []
        matches_without_round = []
        for match in round_matches:
            if match.pitch:
                match_obj = re.search(r'Round\s+(\d+)', match.pitch, re.IGNORECASE)
                if match_obj:
                    match_round = int(match_obj.group(1))
                    if match_round == earliest_round:
                        validated_matches.append(match)
                    else:
                        invalid_rounds.append((match_round, match.id, match.pitch))
                else:
                    # Match doesn't have a round number in pitch - include it but log warning
                    matches_without_round.append((match.id, match.pitch))
                    # Include matches without round numbers as they might be from the correct round
                    # (based on date or other criteria)
                    validated_matches.append(match)
            else:
                # Match has no pitch field - include it but log warning
                matches_without_round.append((match.id, None))
                validated_matches.append(match)
        
        # Log detailed information about validation
        if invalid_rounds:
            print(f"  Warning: Found {len(invalid_rounds)} matches from different rounds:")
            for round_num, match_id, pitch in invalid_rounds[:5]:  # Show first 5
                print(f"    Match {match_id}: Round {round_num} (pitch: '{pitch}')")
            if len(invalid_rounds) > 5:
                print(f"    ... and {len(invalid_rounds) - 5} more")
            print(f"  Filtering to Round {earliest_round} only.")
        
        if matches_without_round:
            print(f"  Warning: Found {len(matches_without_round)} matches without round numbers in pitch:")
            for match_id, pitch in matches_without_round[:5]:  # Show first 5
                print(f"    Match {match_id}: pitch='{pitch}'")
            if len(matches_without_round) > 5:
                print(f"    ... and {len(matches_without_round) - 5} more")
            print(f"  Including them as they may belong to Round {earliest_round}.")
        
        original_count = len(round_matches)
        if not validated_matches:
            # If validation failed, log and use original matches (shouldn't happen)
            print(f"  Error: Round validation filtered out all {original_count} matches for round {earliest_round}.")
            print(f"  This suggests matches have incorrect round numbers in their pitch field.")
            # Still use original matches but log the issue
            validated_matches = round_matches
        else:
            if len(validated_matches) < original_count:
                print(f"  Filtered {original_count - len(validated_matches)} matches from wrong rounds. Using {len(validated_matches)} matches for Round {earliest_round}.")
            elif len(validated_matches) == original_count:
                print(f"  All {len(validated_matches)} matches validated for Round {earliest_round}.")
            round_matches = validated_matches
        
        # Use the actual round number from the matches
        round_number = earliest_round
        
        # For combinationB, group stage matches have "Group" in pitch
        is_league_stage = True
        if round_matches and round_matches[0].pitch:
            if not round_matches[0].pitch.startswith('Group'):
                is_league_stage = False
        
        # Log for debugging
        print(f"\n{'='*60}")
        print(f"get_next_round_matches: Tournament {tournament.id} - {tournament.name}")
        print(f"  Format: {tournament.format} (combinationB: {is_combinationB})")
        print(f"  Found Round {round_number} with {len(round_matches)} scheduled matches")
        print(f"  Incomplete rounds found: {sorted(incomplete_rounds)}")
        if round_number in round_totals:
            print(f"  Round {round_number} totals: {round_totals[round_number]['finished']} finished, {round_totals[round_number]['scheduled']} scheduled, {round_totals[round_number]['total']} total")
        
        # Log match breakdown by group for this round
        if round_matches:
            matches_by_group = {}
            for match in round_matches:
                if match.pitch:
                    # Extract group name (e.g., "Group A - Round 1" -> "Group A")
                    group_match = re.search(r'Group\s+[A-Z]', match.pitch, re.IGNORECASE)
                    if group_match:
                        group_name = group_match.group(0)
                        if group_name not in matches_by_group:
                            matches_by_group[group_name] = []
                        matches_by_group[group_name].append(match)
            
            print(f"  Matches in Round {round_number} by group:")
            total_by_group = 0
            for group_name, group_matches in sorted(matches_by_group.items()):
                print(f"    {group_name}: {len(group_matches)} matches")
                total_by_group += len(group_matches)
            
            # Safety check: ensure all matches are accounted for
            if total_by_group != len(round_matches):
                print(f"  WARNING: Match count mismatch! Group total: {total_by_group}, Round total: {len(round_matches)}")
                print(f"  This suggests some matches don't have group names in their pitch field.")
                matches_without_group = []
                for match in round_matches:
                    if not match.pitch or not re.search(r'Group\s+[A-Z]', match.pitch, re.IGNORECASE):
                        matches_without_group.append(match)
                if matches_without_group:
                    print(f"    Found {len(matches_without_group)} matches without group names:")
                    for match in matches_without_group[:3]:
                        print(f"      Match {match.id}: pitch='{match.pitch}'")
            
            # Note: It's normal for some groups to finish earlier than others
            # (e.g., 13 teams: Group A has 7 rounds, Group B has 5 rounds)
            # So rounds 6-7 will only have matches from Group A
            if len(matches_by_group) < 2 and round_number > 1:
                print(f"  Note: Only {len(matches_by_group)} group(s) have matches in Round {round_number}")
                print(f"  This is expected when groups have different numbers of rounds.")
        print(f"{'='*60}\n")
        
        return (round_number, round_matches, is_league_stage)
    
    # For other formats, use date-based grouping (original logic)
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
    
    # Safety check: Ensure all matches belong to the same round
    # This prevents accidentally simulating multiple rounds at once
    if round_matches:
        first_match_round = None
        for match in round_matches:
            if match.pitch:
                match_obj = re.search(r'Round\s+(\d+)', match.pitch, re.IGNORECASE)
                if match_obj:
                    match_round = int(match_obj.group(1))
                    if first_match_round is None:
                        first_match_round = match_round
                    elif match_round != first_match_round:
                        # Found matches from different rounds - filter to only first round
                        print(f"  Warning: Found matches from different rounds! Filtering to Round {first_match_round} only.")
                        round_matches = [m for m in round_matches if 
                                       m.pitch and re.search(r'Round\s+(\d+)', m.pitch, re.IGNORECASE) and 
                                       int(re.search(r'Round\s+(\d+)', m.pitch, re.IGNORECASE).group(1)) == first_match_round]
                        break
        
        if first_match_round and first_match_round != round_number:
            print(f"  Warning: Round number mismatch. Updating from {round_number} to {first_match_round}")
            round_number = first_match_round
    
    matches_simulated = 0
    failed_matches = []
    
    # Simulate each match individually, continue even if some fail
    # Add retry logic for database locking issues (SQLite)
    for idx, match in enumerate(round_matches):
        max_retries = 3
        retry_delay = 0.1  # Start with 100ms delay
        
        for attempt in range(max_retries):
            try:
                # Use transaction for each match individually
                with transaction.atomic():
                    simulate_match(match)
                    matches_simulated += 1
                    # Small delay between matches to prevent SQLite locking
                    if idx < len(round_matches) - 1:  # Don't delay after last match
                        time.sleep(0.05)  # 50ms delay between matches
                    break  # Success, exit retry loop
            except OperationalError as e:
                # Database locked error - retry with exponential backoff
                if "database is locked" in str(e).lower() or "locked" in str(e).lower():
                    if attempt < max_retries - 1:
                        # Exponential backoff: 0.1s, 0.2s, 0.4s
                        wait_time = retry_delay * (2 ** attempt)
                        print(f"  Database locked for match {match.id}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                    else:
                        # Last attempt failed
                        failed_matches.append({
                            'match_id': match.id,
                            'home_team': match.home_team.name if match.home_team else 'Unknown',
                            'away_team': match.away_team.name if match.away_team else 'Unknown',
                            'error': f"database is locked (failed after {max_retries} attempts): {str(e)}"
                        })
                        print(f"  Failed to simulate match {match.id} after {max_retries} attempts: database is locked")
                else:
                    # Other OperationalError - don't retry
                    failed_matches.append({
                        'match_id': match.id,
                        'home_team': match.home_team.name if match.home_team else 'Unknown',
                        'away_team': match.away_team.name if match.away_team else 'Unknown',
                        'error': str(e)
                    })
                    break
            except Exception as e:
                # Other errors - log and continue
                failed_matches.append({
                    'match_id': match.id,
                    'home_team': match.home_team.name if match.home_team else 'Unknown',
                    'away_team': match.away_team.name if match.away_team else 'Unknown',
                    'error': str(e)
                })
                break
    
    stage_name = "League Stage" if is_league_stage else "Knockout Stage"
    
    # After simulating a group stage round, standings are automatically updated
    # (standings are calculated on-demand from match results, no explicit update needed)
    # But we can log that standings should be recalculated
    if is_league_stage and matches_simulated > 0:
        print(f"Standings updated: {matches_simulated} matches simulated in {stage_name} Round {round_number}")
        # Standings are calculated dynamically from match results when requested
        # No explicit update needed - the standings endpoint calculates from current match data
    
    # After simulating a round, check if we need to generate next stage
    next_round_created = False
    knockout_stage_started = False
    
    # Check if group stage is complete (for combinationB tournaments)
    if tournament.format == 'combination':
        structure = tournament.structure or {}
        combination_type = structure.get('combination_type', 'combinationA')
        
        if combination_type == 'combinationB' and is_league_stage:
            # Check if all group stage matches are complete
            group_matches = Match.objects.filter(
                tournament=tournament,
                pitch__icontains='Group'
            )
            unfinished_groups = group_matches.filter(status__in=['scheduled', 'live'])
            
            if not unfinished_groups.exists() and group_matches.exists():
                # All group stage matches complete - generate knockout stage
                try:
                    print(f"All group stage matches complete. Generating knockout stage...")
                    knockout_stage_started = generate_knockout_stage_from_groups(tournament)
                    if knockout_stage_started:
                        print(f"Knockout stage generated successfully")
                    else:
                        print(f"Knockout stage generation returned False (may already exist)")
                except Exception as e:
                    print(f"Error generating knockout stage: {str(e)}")
                    import traceback
                    print(traceback.format_exc())
    
    # After simulating a knockout round, generate next round if applicable
    if not is_league_stage and matches_simulated > 0:
        try:
            # Get the round name from the matches that were just simulated
            if round_matches and len(round_matches) > 0:
                completed_round_name = round_matches[0].pitch
                # Only generate next round if this is a knockout round (not group stage)
                if completed_round_name and completed_round_name.strip() and 'Group' not in completed_round_name:
                    print(f"Attempting to generate next round after: {completed_round_name}")
                    next_round_created = generate_next_knockout_round(tournament, completed_round_name)
                    if next_round_created:
                        print(f"Successfully generated next round after {completed_round_name}")
                    else:
                        print(f"Failed to generate next round after {completed_round_name} (may already exist or not enough winners)")
        except Exception as e:
            # Log error but don't fail the simulation
            import traceback
            print(f"Error generating next knockout round: {str(e)}")
            print(traceback.format_exc())
    
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


def get_round_name(num_teams):
    """
    Get proper round name based on number of teams.
    Returns: "Round of 16", "Quarter-Finals", "Semi-Finals", or "Final"
    """
    if num_teams >= 16:
        return "Round of 16"
    elif num_teams >= 8:
        return "Quarter-Finals"
    elif num_teams >= 4:
        return "Semi-Finals"
    else:
        return "Final"


def generate_next_knockout_round(tournament, completed_round_name):
    """
    Generate the next round of knockout matches after a round completes.
    Only generates if all matches in the current round are finished.
    
    Args:
        tournament: Tournament instance
        completed_round_name: The round name that just completed (e.g., "Quarter-Finals")
    
    Returns:
        bool: True if next round was created, False otherwise
    """
    # Validate inputs
    if not completed_round_name or not completed_round_name.strip():
        print(f"Invalid round name: {completed_round_name}")
        return False
    
    print(f"\n{'='*60}")
    print(f"=== Generating next round after: {completed_round_name} ===")
    print(f"Tournament ID: {tournament.id}")
    print(f"Tournament Name: {tournament.name}")
    print(f"Tournament Format: {tournament.format}")
    print(f"Completed Round Name: '{completed_round_name}'")
    print(f"{'='*60}\n")
    
    try:
        # Normalize round name for matching (strip whitespace, handle variations)
        normalized_round_name = completed_round_name.strip()
        
        # Get all matches from the completed round (match by pitch field)
        # Use case-insensitive matching to handle variations in round names
        completed_round_matches = Match.objects.filter(
            tournament=tournament
        ).exclude(pitch__icontains='Group')
        
        # Debug: Log all knockout matches to see what we're working with
        all_knockout = Match.objects.filter(tournament=tournament).exclude(pitch__icontains='Group')
        print(f"\nDEBUG: All knockout matches in tournament ({all_knockout.count()} total):")
        for m in all_knockout[:20]:
            print(f"  Match {m.id}: pitch='{m.pitch}', status={m.status}, home={m.home_team.name if m.home_team else 'None'}, away={m.away_team.name if m.away_team else 'None'}")
        
        # Filter by round name (case-insensitive match)
        # Handle variations like "Quarter-Finals", "Quarter Finals", "Semi-Finals", "Semi Finals", etc.
        # Try multiple matching strategies for robustness
        matches_by_exact = completed_round_matches.filter(pitch__iexact=normalized_round_name)
        matches_by_contains = completed_round_matches.filter(pitch__icontains=normalized_round_name)
        
        # Use exact match if available, otherwise use contains
        if matches_by_exact.exists():
            completed_round_matches = matches_by_exact
            print(f"Using exact match for round name: '{normalized_round_name}' -> Found {matches_by_exact.count()} matches")
        else:
            completed_round_matches = matches_by_contains
            print(f"Using contains match for round name: '{normalized_round_name}' -> Found {matches_by_contains.count()} matches")
            # Log what matches were found
            for m in matches_by_contains[:10]:
                print(f"  Found match {m.id} with pitch: '{m.pitch}'")
        
        print(f"Total matches found for round '{completed_round_name}': {completed_round_matches.count()}")
    except Exception as e:
        print(f"Error filtering matches in generate_next_knockout_round: {str(e)}")
        return False
    
    # Check if all matches in this round are finished
    if not completed_round_matches.exists():
        print(f"No matches found for round: {completed_round_name}")
        return False
    
    total_matches = completed_round_matches.count()
    finished_matches = completed_round_matches.filter(status='finished').count()
    unfinished = completed_round_matches.filter(status__in=['scheduled', 'live'])
    unfinished_count = unfinished.count()
    
    print(f"Round {completed_round_name}: {finished_matches}/{total_matches} matches finished, {unfinished_count} unfinished")
    
    if unfinished.exists():
        # Not all matches finished yet, don't generate next round
        print(f"Not all matches in {completed_round_name} are finished. Waiting for {unfinished_count} more match(es).")
        return False
    
    # Get winners from completed matches
    winners = []
    try:
        print(f"Processing {completed_round_matches.count()} matches from round: {completed_round_name}")
        for match in completed_round_matches:
            print(f"  Processing match {match.id}: {match.home_team.name if match.home_team else 'TBC'} vs {match.away_team.name if match.away_team else 'TBC'}")
            print(f"    Status: {match.status}, Score: {match.home_score}-{match.away_score}, Penalties: {match.home_penalties}-{match.away_penalties}")
            
            if match.status == 'finished' and match.home_score is not None and match.away_score is not None:
                if match.home_score > match.away_score:
                    if match.home_team:
                        winners.append(match.home_team)
                        print(f"    ✓ Winner: {match.home_team.name} (beat {match.away_team.name if match.away_team else 'TBC'} {match.home_score}-{match.away_score})")
                    else:
                        print(f"    ✗ Warning: Match {match.id} has no home team")
                elif match.away_score > match.home_score:
                    if match.away_team:
                        winners.append(match.away_team)
                        print(f"    ✓ Winner: {match.away_team.name} (beat {match.home_team.name if match.home_team else 'TBC'} {match.away_score}-{match.home_score})")
                    else:
                        print(f"    ✗ Warning: Match {match.id} has no away team")
                else:
                    # Draw - check penalties
                    print(f"    Draw detected - checking penalties...")
                    if match.home_penalties is not None and match.away_penalties is not None:
                        if match.home_penalties > match.away_penalties:
                            if match.home_team:
                                winners.append(match.home_team)
                                print(f"    ✓ Winner: {match.home_team.name} (won on penalties {match.home_penalties}-{match.away_penalties})")
                            else:
                                print(f"    ✗ Warning: Match {match.id} has no home team")
                        elif match.away_penalties > match.home_penalties:
                            if match.away_team:
                                winners.append(match.away_team)
                                print(f"    ✓ Winner: {match.away_team.name} (won on penalties {match.away_penalties}-{match.home_penalties})")
                            else:
                                print(f"    ✗ Warning: Match {match.id} has no away team")
                        # If penalties are also tied (shouldn't happen, but handle gracefully)
                        else:
                            print(f"    ✗ Warning: Match {match.id} ended in a draw with tied penalties ({match.home_penalties}-{match.away_penalties}). Skipping.")
                    else:
                        # Draw without penalties - this shouldn't happen in knockout, but handle gracefully
                        print(f"    ✗ Warning: Match {match.id} ended in a draw without penalties. Score: {match.home_score}-{match.away_score}. Skipping.")
            else:
                print(f"    ✗ Match {match.id} is not finished or missing scores. Status: {match.status}, Home: {match.home_score}, Away: {match.away_score}")
        print(f"Total winners extracted: {len(winners)}")
        if len(winners) > 0:
            print(f"Winners: {', '.join([w.name for w in winners])}")
        
        # Validation: Ensure all finished matches produced a winner
        finished_count = completed_round_matches.filter(status='finished').count()
        if len(winners) < finished_count:
            print(f"⚠ Warning: Only {len(winners)} winners extracted from {finished_count} finished matches.")
            print(f"  This means {finished_count - len(winners)} match(es) did not produce a winner.")
            print(f"  This could be due to:")
            print(f"    - Draws without penalties")
            print(f"    - Tied penalties")
            print(f"    - Missing teams")
        elif len(winners) == finished_count:
            print(f"✓ Validation passed: All {finished_count} finished matches produced winners.")
    except Exception as e:
        print(f"Error extracting winners in generate_next_knockout_round: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False
    
    # Need at least 2 winners to create next round
    if len(winners) < 2:
        print(f"✗ Not enough winners ({len(winners)}) to create next round. Need at least 2.")
        if len(winners) == 1:
            print(f"  Only 1 winner found. This might be the final match - no next round needed.")
        elif len(winners) == 0:
            print(f"  No winners found. Check if matches are finished and have valid results.")
        return False
    
    # Determine next round name based on number of winners
    try:
        next_round_name = get_round_name(len(winners))
        print(f"\n{'='*60}")
        print(f"Determining next round name...")
        print(f"  Number of winners: {len(winners)}")
        print(f"  Next round name: '{next_round_name}'")
        if next_round_name.lower() == "final":
            print(f"  ✓ This is the FINAL round!")
        elif len(winners) == 2 and next_round_name.lower() != "final":
            print(f"  ⚠ WARNING: Expected 'Final' for 2 winners, but got '{next_round_name}'")
        print(f"{'='*60}\n")
    except Exception as e:
        print(f"Error getting round name in generate_next_knockout_round: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False
    
    # Check if next round already exists (case-insensitive match)
    try:
        print(f"\n{'='*60}")
        print(f"Checking if next round '{next_round_name}' already exists...")
        
        # Use both exact and contains matching to be thorough
        existing_exact = Match.objects.filter(
            tournament=tournament
        ).exclude(pitch__icontains='Group').filter(
            pitch__iexact=next_round_name
        )
        existing_contains = Match.objects.filter(
            tournament=tournament
        ).exclude(pitch__icontains='Group').filter(
            pitch__icontains=next_round_name
        )
        
        existing_count_exact = existing_exact.count()
        existing_count_contains = existing_contains.count()
        
        # Special logging for Final
        if next_round_name.lower() == "final":
            print(f"  Special handling for Final round...")
            # Get ALL matches with pitch containing "final" (case-insensitive) for debugging
            all_final_matches = Match.objects.filter(
                tournament=tournament
            ).exclude(pitch__icontains='Group').filter(
                pitch__icontains='final'
            )
            print(f"  All matches with pitch containing 'final' (case-insensitive): {all_final_matches.count()}")
            for m in all_final_matches:
                print(f"    Match {m.id}: pitch='{m.pitch}', status={m.status}, home={m.home_team.name if m.home_team else 'TBC'}, away={m.away_team.name if m.away_team else 'TBC'}")
        
        print(f"  Exact match count: {existing_count_exact}")
        print(f"  Contains match count: {existing_count_contains}")
        
        if existing_count_exact > 0:
            # Next round already exists (exact match)
            print(f"  ✗ Next round '{next_round_name}' already exists ({existing_count_exact} match(es) with exact match). Skipping creation.")
            # Log the existing matches for debugging
            for m in existing_exact[:5]:
                print(f"    Existing match {m.id}: {m.home_team.name if m.home_team else 'TBC'} vs {m.away_team.name if m.away_team else 'TBC'} (pitch: '{m.pitch}', status: {m.status})")
            print(f"{'='*60}\n")
            return False
        elif existing_count_contains > 0:
            # Check if contains match is actually the same round (not a substring match)
            # For "Final", we want exact match only to avoid false positives
            if next_round_name.lower() == "final":
                # For Final, be strict - only exact match
                print(f"  ⚠ Next round '{next_round_name}' might exist ({existing_count_contains} match(es) with contains match). Checking...")
                # Log the existing matches for debugging
                for m in existing_contains[:5]:
                    print(f"    Potential match {m.id}: {m.home_team.name if m.home_team else 'TBC'} vs {m.away_team.name if m.away_team else 'TBC'} (pitch: '{m.pitch}', status: {m.status})")
                # If any match has pitch exactly "Final" (case-insensitive), it exists
                exact_final_found = any(m.pitch and m.pitch.strip().lower() == "final" for m in existing_contains)
                if exact_final_found:
                    print(f"  ✗ Next round '{next_round_name}' already exists (exact 'Final' found). Skipping creation.")
                    print(f"{'='*60}\n")
                    return False
                else:
                    # Contains match but not exact - might be false positive, proceed with creation
                    print(f"  ✓ Contains match found but not exact 'Final'. Proceeding with creation.")
            else:
                # For other rounds, contains match is sufficient
                print(f"  ✗ Next round '{next_round_name}' already exists ({existing_count_contains} match(es) with contains match). Skipping creation.")
                for m in existing_contains[:5]:
                    print(f"    Existing match {m.id}: {m.home_team.name if m.home_team else 'TBC'} vs {m.away_team.name if m.away_team else 'TBC'} (pitch: '{m.pitch}', status: {m.status})")
                print(f"{'='*60}\n")
                return False
        else:
            print(f"  ✓ Next round '{next_round_name}' does not exist. Proceeding with creation.")
            print(f"{'='*60}\n")
    except Exception as e:
        print(f"Error checking existing next round: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False
    
    # Calculate next round date (1 day after last match in completed round)
    try:
        last_match = completed_round_matches.order_by('-kickoff_at').first()
        if not last_match:
            print(f"✗ Error: No last match found in completed round")
            return False
        if not last_match.kickoff_at:
            print(f"✗ Error: Last match {last_match.id} has no kickoff_at")
            return False
        
        next_round_date = last_match.kickoff_at + timedelta(days=1)
        print(f"Calculated next round date: {next_round_date} (1 day after {last_match.kickoff_at})")
    except Exception as e:
        print(f"✗ Error calculating next round date: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False
    
    # Create matches for next round
    num_matches = len(winners) // 2
    matches_created = 0
    
    print(f"\n=== Creating {num_matches} match(es) for {next_round_name} with {len(winners)} winners ===")
    print(f"Next round date: {next_round_date}")
    
    try:
        for i in range(num_matches):
            home_team = winners[i * 2]
            away_team = winners[i * 2 + 1]
            
            if not home_team or not away_team:
                print(f"✗ Warning: Skipping match {i+1} - missing team (home: {home_team}, away: {away_team})")
                continue
            
            print(f"  Creating match {i+1}/{num_matches}: {home_team.name} vs {away_team.name}")
            match = Match.objects.create(
                tournament=tournament,
                home_team=home_team,
                away_team=away_team,
                kickoff_at=next_round_date,
                status='scheduled',
                pitch=next_round_name
            )
            matches_created += 1
            print(f"  ✓ Created match {match.id}: {home_team.name} vs {away_team.name} in {next_round_name}")
    except Exception as e:
        import traceback
        print(f"✗ Error creating matches in generate_next_knockout_round: {str(e)}")
        print(traceback.format_exc())
        return False
    
    print(f"\n=== Successfully created {matches_created} match(es) for {next_round_name} ===")
    return matches_created > 0


def can_determine_group_qualifiers(tournament):
    """
    Check if group stage qualifiers (top 2 from each group) can be determined.
    This checks if all group matches are finished.
    
    Returns:
        bool: True if qualifiers can be determined, False otherwise
    """
    from .models import Match
    from .tournament_formats import generate_groups
    
    # Only for combinationB format
    if tournament.format != 'combination':
        return False
    
    structure = tournament.structure or {}
    combination_type = structure.get('combination_type', 'combinationA')
    if combination_type != 'combinationB':
        return False
    
    # Check if knockout stage already exists
    knockout_matches = Match.objects.filter(
        tournament=tournament
    ).exclude(pitch__icontains='Group')
    
    if knockout_matches.exists():
        return False  # Already generated
    
    # Get all teams
    registrations = tournament.registrations.filter(status__in=['pending', 'paid']).select_related('team')
    teams = [reg.team for reg in registrations]
    
    if len(teams) < 4:
        return False
    
    # Get groups
    groups = generate_groups(teams, "combinationB")
    
    # Get all group matches
    all_group_matches = Match.objects.filter(
        tournament=tournament,
        pitch__icontains='Group'
    )
    
    # Check if all group matches are finished
    finished_group_matches = all_group_matches.filter(status='finished')
    
    # If all group matches are finished, qualifiers can be determined
    if finished_group_matches.count() == all_group_matches.count() and all_group_matches.count() > 0:
        return True
    
    return False


def generate_knockout_stage_from_groups(tournament):
    """
    Generate knockout stage matches for combinationB tournaments after group stage completes.
    Top 2 teams from each group advance to knockout stage.
    World Cup format: Group A 1st vs Group B 2nd, Group B 1st vs Group A 2nd, etc.
    
    Returns:
        bool: True if knockout stage was created, False otherwise
    """
    from .models import Match, Team
    from .tournament_formats import generate_groups, calculate_group_standings
    from datetime import timedelta
    
    # Check if knockout stage already exists
    knockout_matches = Match.objects.filter(
        tournament=tournament
    ).exclude(pitch__icontains='Group')
    
    if knockout_matches.exists():
        # Knockout stage already generated
        return False
    
    # Get all registrations
    registrations = tournament.registrations.filter(status__in=['pending', 'paid']).select_related('team')
    teams = [reg.team for reg in registrations]
    
    if len(teams) < 4:
        return False  # Need at least 4 teams
    
    # Recreate groups (same logic as fixture generation)
    groups = generate_groups(teams, "combinationB")
    
    # Get all finished matches for standings calculation
    all_matches = list(Match.objects.filter(tournament=tournament, status='finished'))
    
    # Calculate standings for each group and store qualifiers with group info
    group_qualifiers = {}  # {group_name: {'first': team, 'second': team}}
    for group in groups:
        group_name = group["name"]
        group_teams = group["teams"]
        # Filter matches for this group
        group_matches = [m for m in all_matches if m.pitch and m.pitch.startswith(group_name)]
        standings_list = calculate_group_standings(group_teams, group_matches, group_name)
        
        if standings_list and len(standings_list) >= 2:
            # Get top 2 teams
            first_place = standings_list[0]['team']
            second_place = standings_list[1]['team']
            
            # Ensure we have Team objects
            if isinstance(first_place, dict):
                first_place = Team.objects.get(id=first_place.get('id'))
            if isinstance(second_place, dict):
                second_place = Team.objects.get(id=second_place.get('id'))
            
            group_qualifiers[group_name] = {
                'first': first_place,
                'second': second_place
            }
    
    if len(group_qualifiers) < 2:
        return False  # Need at least 2 groups
    
    # Get last group stage match date
    last_group_match = Match.objects.filter(
        tournament=tournament,
        pitch__icontains='Group'
    ).order_by('-kickoff_at').first()
    
    if not last_group_match:
        return False
    
    # Start knockout stage 1 day after group stage ends
    knockout_start_date = last_group_match.kickoff_at + timedelta(days=1)
    
    # World Cup format pairings: Cross-group pairings
    # Group A 1st vs Group B 2nd, Group B 1st vs Group A 2nd
    # Group C 1st vs Group D 2nd, Group D 1st vs Group C 2nd
    # etc.
    
    group_names = sorted(group_qualifiers.keys())  # ['Group A', 'Group B', 'Group C', ...]
    matches_created = 0
    num_qualifiers = len(group_qualifiers) * 2  # Total number of qualifying teams
    
    print(f"\n=== Generating Knockout Stage ===")
    print(f"Number of groups: {len(group_qualifiers)}")
    print(f"Number of qualifiers: {num_qualifiers}")
    print(f"Group names: {group_names}")
    
    # Determine proper round name based on number of teams
    if num_qualifiers >= 16:
        round_name = "Round of 16"
    elif num_qualifiers >= 8:
        round_name = "Quarter-Finals"
    elif num_qualifiers >= 4:
        round_name = "Semi-Finals"
    else:
        round_name = "Final"
    
    print(f"Knockout round name: {round_name}")
    
    # Pair adjacent groups: A vs B, C vs D, etc.
    # For 2 groups: A 1st vs B 2nd, B 1st vs A 2nd (Semi-Finals)
    # For 4 groups: A 1st vs B 2nd, B 1st vs A 2nd, C 1st vs D 2nd, D 1st vs C 2nd (Quarter-Finals)
    for i in range(0, len(group_names) - 1, 2):
        group1_name = group_names[i]
        group2_name = group_names[i + 1] if i + 1 < len(group_names) else None
        
        if group2_name:
            group1_first = group_qualifiers[group1_name]['first']
            group1_second = group_qualifiers[group1_name]['second']
            group2_first = group_qualifiers[group2_name]['first']
            group2_second = group_qualifiers[group2_name]['second']
            
            print(f"  Pairing {group1_name} vs {group2_name}:")
            print(f"    Match 1: {group1_first.name} ({group1_name} 1st) vs {group2_second.name} ({group2_name} 2nd)")
            print(f"    Match 2: {group2_first.name} ({group2_name} 1st) vs {group1_second.name} ({group1_name} 2nd)")
            
            # Group 1 1st vs Group 2 2nd
            match1 = Match.objects.create(
                tournament=tournament,
                home_team=group1_first,
                away_team=group2_second,
                kickoff_at=knockout_start_date,
                status='scheduled',
                pitch=round_name
            )
            matches_created += 1
            print(f"    ✓ Created match {match1.id}")
            
            # Group 2 1st vs Group 1 2nd
            match2 = Match.objects.create(
                tournament=tournament,
                home_team=group2_first,
                away_team=group1_second,
                kickoff_at=knockout_start_date,
                status='scheduled',
                pitch=round_name
            )
            matches_created += 1
            print(f"    ✓ Created match {match2.id}")
    
    # If odd number of groups, handle the last group
    if len(group_names) % 2 == 1:
        last_group_name = group_names[-1]
        print(f"  Warning: Odd number of groups ({len(group_names)}). Last group {last_group_name} not paired.")
        # Pair with previous group's second place (or create a bye)
        # For now, we'll pair it with the previous group's structure
        # This is a simplified approach - in real World Cup, groups are predetermined
    
    print(f"=== Created {matches_created} knockout match(es) for {round_name} ===")
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
    
    # Update match scores
    match.home_score = home_score
    match.away_score = away_score
    
    # Check if this is a knockout match and if it ended in a draw
    is_knockout = False
    if match.tournament.format == 'knockout':
        is_knockout = True
    elif match.tournament.format == 'combination':
        # Check if pitch indicates knockout stage (not group stage)
        if match.pitch and 'Group' not in match.pitch:
            is_knockout = True
    
    # If knockout match ends in draw, simulate penalties
    if is_knockout and home_score == away_score:
        # Simulate penalty shootout (typically 3-5 penalties per team, winner has more)
        home_penalties = random.randint(3, 5)
        away_penalties = random.randint(3, 5)
        
        # Ensure there's a winner (one team must have more)
        while home_penalties == away_penalties:
            if random.random() < 0.5:
                home_penalties += 1
            else:
                away_penalties += 1
        
        match.home_penalties = home_penalties
        match.away_penalties = away_penalties
    else:
        # Clear penalties for non-draws or non-knockout matches
        match.home_penalties = None
        match.away_penalties = None
    
    match.status = 'finished'
    match.save()
    
    # Check if tournament should be marked as completed
    # Only mark as completed when the Final match is finished
    match_pitch = match.pitch or ""
    is_final_match = "final" in match_pitch.lower() and match_pitch.lower().strip() == "final"
    
    if is_final_match and match.status == 'finished':
        if match.tournament.status != 'completed':
            match.tournament.status = 'completed'
            match.tournament.save()
            print(f"\n{'='*60}")
            print(f"✓ Tournament '{match.tournament.name}' marked as COMPLETED")
            print(f"  Final match finished")
            print(f"{'='*60}\n")
    
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
    # Track minutes used to ensure unique (match, player, minute) combinations
    used_minutes_home = {}  # player_id -> set of minutes used
    used_minutes_away = {}  # player_id -> set of minutes used
    
    for scorer in home_scorers:
        # Ensure unique minute for this player in this match
        if scorer.id not in used_minutes_home:
            used_minutes_home[scorer.id] = set()
        
        # Find an unused minute for this player (try up to 90 times)
        minute = None
        for _ in range(90):
            candidate_minute = random.randint(1, 90)
            if candidate_minute not in used_minutes_home[scorer.id]:
                minute = candidate_minute
                used_minutes_home[scorer.id].add(minute)
                break
        
        # If all minutes used (unlikely), use None or try to find any unused
        if minute is None:
            # Use a sequential minute based on goals already scored
            minute = len(used_minutes_home[scorer.id]) + 1
        
        goal = MatchScorer.objects.create(
            match=match,
            player=scorer,
            team=match.home_team,
            minute=minute
        )
        
        # 60% chance of assist (not all goals have assists)
        if random.random() < 0.6:
            # Select assister (different from scorer, on same team)
            possible_assisters = [p for p in home_players if p.id != scorer.id]
            if possible_assisters:
                assister = random.choice(possible_assisters)
                try:
                    MatchAssist.objects.create(
                        goal=goal,
                        match=match,
                        player=assister,
                        team=match.home_team
                    )
                except Exception:
                    # Skip assist if creation fails (e.g., already exists)
                    pass
    
    for scorer in away_scorers:
        # Ensure unique minute for this player in this match
        if scorer.id not in used_minutes_away:
            used_minutes_away[scorer.id] = set()
        
        # Find an unused minute for this player
        minute = None
        for _ in range(90):
            candidate_minute = random.randint(1, 90)
            if candidate_minute not in used_minutes_away[scorer.id]:
                minute = candidate_minute
                used_minutes_away[scorer.id].add(minute)
                break
        
        if minute is None:
            minute = len(used_minutes_away[scorer.id]) + 1
        
        goal = MatchScorer.objects.create(
            match=match,
            player=scorer,
            team=match.away_team,
            minute=minute
        )
        
        # 60% chance of assist
        if random.random() < 0.6:
            possible_assisters = [p for p in away_players if p.id != scorer.id]
            if possible_assisters:
                assister = random.choice(possible_assisters)
                try:
                    MatchAssist.objects.create(
                        goal=goal,
                        match=match,
                        player=assister,
                        team=match.away_team
                    )
                except Exception:
                    # Skip assist if creation fails
                    pass
    
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
    
    # Update clean sheets for goalkeepers
    # Home team goalkeeper gets clean sheet if away_score == 0
    home_gk = [p for p in home_players if p.position == 'GK']
    if home_gk and away_score == 0:
        home_gk[0].clean_sheets += 1
        home_gk[0].save()
    
    # Away team goalkeeper gets clean sheet if home_score == 0
    away_gk = [p for p in away_players if p.position == 'GK']
    if away_gk and home_score == 0:
        away_gk[0].clean_sheets += 1
        away_gk[0].save()

