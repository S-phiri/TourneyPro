"""
Helper functions for seeding test data
Can be used by management commands and API endpoints
"""
from django.contrib.auth.models import User
from django.db import connection, transaction
from django.db.utils import OperationalError
from django.utils import timezone
from datetime import datetime, timedelta
from tournaments.models import Tournament, Team, Registration, Player, TeamPlayer, Match
from tournaments.tournament_formats import generate_fixtures_for_tournament
from accounts.models import UserProfile
import random
import time


def seed_test_teams(tournament, num_teams=8, mark_paid=False, players_per_team=0, simulate_games=False):
    """
    Create test teams and managers for a tournament
    
    Args:
        tournament: Tournament instance
        num_teams: Number of teams to create (default: 8)
        mark_paid: Whether to mark registrations as paid (default: False)
        players_per_team: Number of players to add to each team (default: 0, uses 11-15 if not specified)
        simulate_games: Whether to generate fixtures and simulate games (default: False)
    
    Returns:
        dict with 'teams_created', 'managers_created', 'registrations_created', 'players_created', 
        'matches_created', 'matches_simulated', and 'credentials'
    """
    # Check current registrations
    current_count = tournament.registrations.count()
    
    # Allow adding players to existing teams even if tournament is full
    if num_teams == 0:
        # Just adding players to existing teams
        teams_to_create = 0
    elif current_count >= tournament.team_max:
        return {
            'error': f'Tournament is already full ({current_count}/{tournament.team_max})',
            'teams_created': 0,
            'managers_created': 0,
            'registrations_created': 0,
            'players_created': 0,
            'matches_created': 0,
            'matches_simulated': 0,
            'credentials': []
        }
    else:
        # Calculate how many teams we can add
        available_slots = tournament.team_max - current_count
        teams_to_create = min(num_teams, available_slots)
    
    # Default players per team if not specified (11-15 players for a realistic team)
    if players_per_team == 0:
        players_per_team = random.randint(11, 15)

    # Team name templates
    team_names = [
        'Thunder FC', 'Lightning United', 'Storm Strikers', 'Eagle Warriors',
        'Lion Kings', 'Tiger FC', 'Falcon United', 'Wolfpack FC',
        'Phoenix Rising', 'Dragon FC', 'Sharks United', 'Hawks FC',
        'Panthers FC', 'Rangers United', 'Vikings FC', 'Crusaders United'
    ]

    # Manager names
    first_names = ['John', 'Sarah', 'Mike', 'David', 'Emma', 'James', 'Lisa', 'Chris']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']

    created_teams = []
    managers_created = 0
    players_created = 0
    
    # Get existing teams if we're just adding players
    teams_to_process = []
    if teams_to_create == 0 and num_teams == 0:
        # Add players to existing teams that don't have players
        registrations = Registration.objects.filter(
            tournament=tournament,
            status__in=['pending', 'paid']
        ).select_related('team')
        
        for reg in registrations:
            team = reg.team
            # Check if team has players
            player_count = TeamPlayer.objects.filter(team=team).count()
            if player_count == 0:
                teams_to_process.append({
                    'team': team,
                    'registration': reg,
                    'manager': team.manager_user if hasattr(team, 'manager_user') else None
                })
    
    # Ensure connection is ready before starting transaction
    connection.ensure_connection()
    
    # Add retry logic for database operations to handle SQLite locking
    max_retries = 5
    last_error = None
    for attempt in range(max_retries):
        try:
            # Close any existing connection before retry
            if attempt > 0:
                connection.close()
                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                connection.ensure_connection()
            
            with transaction.atomic():
                # Process new teams
                for i in range(teams_to_create):
                    # Generate unique team name
                    team_name_template = team_names[i % len(team_names)]
                    team_name = f"{team_name_template} {i+1}" if i >= len(team_names) else team_name_template
                    
                    # Ensure unique team name
                    base_name = team_name
                    counter = 1
                    while Team.objects.filter(name=team_name).exists():
                        team_name = f"{base_name} {counter}"
                        counter += 1

                    # Generate manager details
                    manager_first = random.choice(first_names)
                    manager_last = random.choice(last_names)
                    manager_name = f"{manager_first} {manager_last}"
                    
                    # Generate unique email
                    base_email = f"{manager_first.lower()}.{manager_last.lower()}"
                    manager_email = f"{base_email}@test.com"
                    counter = 1
                    while User.objects.filter(email=manager_email).exists():
                        manager_email = f"{base_email}{counter}@test.com"
                        counter += 1

                    # Create or get manager user
                    username = manager_email.split('@')[0]
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1

                    manager_user, user_created = User.objects.get_or_create(
                        email=manager_email,
                        defaults={
                            'username': username,
                            'first_name': manager_first,
                            'last_name': manager_last,
                            'is_active': True,
                        }
                    )
                    
                    # Set password (default: 'test1234')
                    if user_created:
                        manager_user.set_password('test1234')
                        manager_user.save()
                        
                        # Create profile with manager role
                        profile, _ = UserProfile.objects.get_or_create(user=manager_user)
                        profile.role_hint = 'manager'
                        profile.save()
                        
                        managers_created += 1

                    # Create team
                    team, team_created = Team.objects.get_or_create(
                        name=team_name,
                        manager_email=manager_email,
                        defaults={
                            'manager_name': manager_name,
                            'manager_user': manager_user,
                            'phone': f'082{random.randint(1000000, 9999999)}'
                        }
                    )

                    if team_created:
                        # Update manager_user if not set
                        if not team.manager_user:
                            team.manager_user = manager_user
                            team.save()

                    # Create registration
                    registration, reg_created = Registration.objects.get_or_create(
                        tournament=tournament,
                        team=team,
                        defaults={
                            'status': 'paid' if mark_paid else 'pending',
                            'paid_amount': tournament.entry_fee if mark_paid else 0
                        }
                    )

                    if not reg_created:
                        # Update existing registration if needed
                        if mark_paid and registration.status != 'paid':
                            registration.status = 'paid'
                            registration.paid_amount = tournament.entry_fee
                            registration.save()

                    created_teams.append({
                        'team': team,
                        'manager': manager_user,
                        'registration': registration
                    })

                    # Always create players for each team
                    player_first_names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 
                                         'Riley', 'Avery', 'Quinn', 'Blake', 'Drew', 'Sam', 'Jake',
                                         'Max', 'Ben', 'Luke', 'Ryan', 'Kyle', 'Nick', 'Zach', 'Noah']
                    player_last_names = ['Anderson', 'Thomas', 'Jackson', 'White', 'Harris',
                                       'Martin', 'Thompson', 'Moore', 'Young', 'Lee', 'Wilson', 'Davis',
                                       'Miller', 'Brown', 'Jones', 'Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez']
                    
                    # Position distribution: 1 GK, 3-4 DF, 3-4 MF, 2-4 FW
                    team_positions = ['GK']  # Always one goalkeeper
                    num_defenders = random.randint(3, 4)
                    num_midfielders = random.randint(3, 4)
                    num_forwards = random.randint(2, 4)
                    
                    for _ in range(num_defenders):
                        team_positions.append('DF')
                    for _ in range(num_midfielders):
                        team_positions.append('MF')
                    for _ in range(num_forwards):
                        team_positions.append('FW')
                    
                    # Shuffle positions and assign to players
                    random.shuffle(team_positions)
                    # Ensure we have enough players
                    while len(team_positions) < players_per_team:
                        team_positions.append(random.choice(['DF', 'MF', 'FW']))

                    team_players = []
                    for j in range(players_per_team):
                        player_first = random.choice(player_first_names)
                        player_last = random.choice(player_last_names)
                        player_name = f"{player_first} {player_last}"
                        
                        # Generate unique email for player
                        player_email_base = f"{player_first.lower()}.{player_last.lower()}"
                        player_email = f"{player_email_base}@{team_name.lower().replace(' ', '').replace('fc', '').replace('united', '').replace('fc', '')}.com"
                        counter = 1
                        while Player.objects.filter(email=player_email).exists():
                            player_email = f"{player_email_base}{counter}@{team_name.lower().replace(' ', '').replace('fc', '').replace('united', '').replace('fc', '')}.com"
                            counter += 1
                        
                        player, _ = Player.objects.get_or_create(
                            first_name=player_first,
                            last_name=player_last,
                            email=player_email,
                            defaults={
                                'position': team_positions[j] if j < len(team_positions) else random.choice(['DF', 'MF', 'FW']),
                                'phone': ''
                            }
                        )

                        TeamPlayer.objects.get_or_create(
                            team=team,
                            player=player,
                            defaults={
                                'number': j + 1,
                                'is_captain': j == 0
                            }
                        )
                        team_players.append(player)
                        players_created += 1
                    
                    # Store team players for later use in simulation
                    created_teams[-1]['players'] = team_players
                
                # Process existing teams to add players
                for team_data in teams_to_process:
                    team = team_data['team']
                    
                    # Always create players for each team
                    player_first_names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 
                                         'Riley', 'Avery', 'Quinn', 'Blake', 'Drew', 'Sam', 'Jake',
                                         'Max', 'Ben', 'Luke', 'Ryan', 'Kyle', 'Nick', 'Zach', 'Noah']
                    player_last_names = ['Anderson', 'Thomas', 'Jackson', 'White', 'Harris',
                                       'Martin', 'Thompson', 'Moore', 'Young', 'Lee', 'Wilson', 'Davis',
                                       'Miller', 'Brown', 'Jones', 'Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez']
                    
                    # Position distribution: 1 GK, 3-4 DF, 3-4 MF, 2-4 FW
                    team_positions = ['GK']  # Always one goalkeeper
                    num_defenders = random.randint(3, 4)
                    num_midfielders = random.randint(3, 4)
                    num_forwards = random.randint(2, 4)
                    
                    for _ in range(num_defenders):
                        team_positions.append('DF')
                    for _ in range(num_midfielders):
                        team_positions.append('MF')
                    for _ in range(num_forwards):
                        team_positions.append('FW')
                    
                    # Shuffle positions and assign to players
                    random.shuffle(team_positions)
                    # Ensure we have enough players
                    while len(team_positions) < players_per_team:
                        team_positions.append(random.choice(['DF', 'MF', 'FW']))

                    team_players = []
                    for j in range(players_per_team):
                        player_first = random.choice(player_first_names)
                        player_last = random.choice(player_last_names)
                        
                        # Generate unique email for player
                        player_email_base = f"{player_first.lower()}.{player_last.lower()}"
                        player_email = f"{player_email_base}@{team.name.lower().replace(' ', '').replace('fc', '').replace('united', '').replace('fc', '')}.com"
                        counter = 1
                        while Player.objects.filter(email=player_email).exists():
                            player_email = f"{player_email_base}{counter}@{team.name.lower().replace(' ', '').replace('fc', '').replace('united', '').replace('fc', '')}.com"
                            counter += 1
                        
                        player, _ = Player.objects.get_or_create(
                            first_name=player_first,
                            last_name=player_last,
                            email=player_email,
                            defaults={
                                'position': team_positions[j] if j < len(team_positions) else random.choice(['DF', 'MF', 'FW']),
                                'phone': ''
                            }
                        )

                        TeamPlayer.objects.get_or_create(
                            team=team,
                            player=player,
                            defaults={
                                'number': j + 1,
                                'is_captain': j == 0
                            }
                        )
                        team_players.append(player)
                        players_created += 1
                    
                    created_teams.append({
                        'team': team,
                        'manager': team_data['manager'],
                        'registration': team_data['registration']
                    })
                
                # Break out of retry loop on success
                break
        except (OperationalError, Exception) as e:
            error_str = str(e).lower()
            last_error = e
            # Check for database locking errors (SQLite specific)
            is_locked_error = (
                "database is locked" in error_str or 
                "locked" in error_str or
                isinstance(e, OperationalError)
            )
            
            if is_locked_error and attempt < max_retries - 1:
                # Close connection and wait before retry
                try:
                    connection.close()
                except:
                    pass
                # Wait with exponential backoff (longer waits)
                wait_time = 1.0 * (attempt + 1)
                time.sleep(wait_time)
                # Reconnect
                connection.ensure_connection()
                continue
            else:
                # Re-raise if not a locking error or max retries reached
                if attempt >= max_retries - 1 and is_locked_error:
                    raise Exception(f"Database is locked after {max_retries} attempts. Please try again in a moment.")
                raise
    
    # Collect credentials (only for newly created managers)
    credentials = []
    for item in created_teams:
        manager = item.get('manager')
        if manager and hasattr(manager, 'email'):
            credentials.append({
                'email': manager.email,
                'username': manager.username,
                'password': 'test1234'
            })

    matches_created = 0
    matches_simulated = 0
    
    # Generate fixtures and simulate games if tournament is now full and simulate_games is True
    if simulate_games:
        # Refresh tournament to get latest registration count
        tournament.refresh_from_db()
        final_count = tournament.registrations.count()
        
        # Only generate fixtures if tournament is full or if we just filled it
        if final_count >= tournament.team_max:
            # Check if fixtures already exist
            existing_matches = Match.objects.filter(tournament=tournament).count()
            
            if existing_matches == 0:
                # Generate fixtures
                try:
                    matches = generate_fixtures_for_tournament(tournament)
                    for match in matches:
                        match.save()
                        matches_created += 1
                    
                    # Note: Simulation is now done round-by-round via separate endpoint
                    matches_simulated = 0
                except Exception as e:
                    # Don't fail the whole operation if simulation fails
                    print(f"Error generating/simulating fixtures: {e}")

    return {
        'teams_created': len(created_teams),
        'managers_created': managers_created,
        'registrations_created': len(created_teams),
        'players_created': players_created,
        'matches_created': matches_created,
        'matches_simulated': matches_simulated,
        'credentials': credentials,
        'message': f'Successfully created {len(created_teams)} teams for "{tournament.name}"'
    }



