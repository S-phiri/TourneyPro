"""
Django management command to set up Benson as the super user/organiser.
Usage: python manage.py setup_benson
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Creates or updates Benson as the super user/organiser'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='benson123',
            help='Password for Benson (default: benson123)',
        )
        parser.add_argument(
            '--email',
            type=str,
            default='benson@tournament.com',
            help='Email for Benson (default: benson@tournament.com)',
        )

    def handle(self, *args, **options):
        username = 'Benson'
        password = options['password']
        email = options['email']
        
        try:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': 'Benson',
                    'last_name': '',
                    'is_staff': True,
                    'is_superuser': True,
                    'is_active': True
                }
            )
            
            if not created:
                # Update existing user
                user.email = email
                user.first_name = 'Benson'
                user.is_staff = True
                user.is_superuser = True
                user.is_active = True
                user.save()
                self.stdout.write(
                    self.style.WARNING(f'✓ Updated existing user: {username}')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created new user: {username}')
                )
            
            # Set password
            user.set_password(password)
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Password set for {username}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'\n✓ Setup complete!')
            )
            self.stdout.write(f'\nLogin credentials:')
            self.stdout.write(f'  Username: {username}')
            self.stdout.write(f'  Password: {password}')
            self.stdout.write(f'  is_staff: {user.is_staff}')
            self.stdout.write(f'  is_superuser: {user.is_superuser}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error setting up user: {str(e)}')
            )

