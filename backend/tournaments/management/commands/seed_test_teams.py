from django.core.management.base import BaseCommand
from tournaments.models import Tournament
from tournaments.seed_helpers import seed_test_teams as seed_teams_helper


class Command(BaseCommand):
    help = 'Create test teams and managers for a tournament'

    def add_arguments(self, parser):
        parser.add_argument(
            'tournament',
            type=str,
            help='Tournament ID or slug'
        )
        parser.add_argument(
            '--teams',
            type=int,
            default=8,
            help='Number of teams to create (default: 8)'
        )
        parser.add_argument(
            '--paid',
            action='store_true',
            help='Mark all registrations as paid'
        )
        parser.add_argument(
            '--players',
            type=int,
            default=0,
            help='Number of players to add to each team (default: 0)'
        )

    def handle(self, *args, **options):
        tournament_identifier = options['tournament']
        num_teams = options['teams']
        mark_paid = options['paid']
        players_per_team = options['players']

        # Find tournament by ID or slug
        try:
            if tournament_identifier.isdigit():
                tournament = Tournament.objects.get(id=int(tournament_identifier))
            else:
                tournament = Tournament.objects.get(slug=tournament_identifier)
        except Tournament.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Tournament "{tournament_identifier}" not found')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Creating {num_teams} teams for tournament: {tournament.name}')
        )

        # Use the helper function
        result = seed_teams_helper(
            tournament=tournament,
            num_teams=num_teams,
            mark_paid=mark_paid,
            players_per_team=players_per_team
        )

        if 'error' in result:
            self.stdout.write(self.style.ERROR(result['error']))
            return

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ {result["message"]}')
        )
        
        if mark_paid:
            self.stdout.write(self.style.SUCCESS('✓ All registrations marked as paid'))
        
        if players_per_team > 0:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Added {players_per_team} players to each team ({result["players_created"]} total)')
            )

        self.stdout.write('\nManager credentials (password: test1234):')
        for cred in result['credentials']:
            self.stdout.write(f'  - {cred["email"]} / {cred["username"]}')

