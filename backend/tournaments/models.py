from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from datetime import datetime

class Venue(models.Model):
    name = models.CharField(max_length=120)
    city = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    map_link = models.URLField(blank=True)

    def __str__(self): return f"{self.name} – {self.city}"

class Tournament(models.Model):
    STATUS_CHOICES = [("draft","Draft"),("open","Open"),("closed","Closed"),("completed","Completed")]
    FORMAT_CHOICES = [
        ("knockout", "Knock-out"),
        ("league", "League / Round Robin"),
        ("combination", "Combination"),
        ("challenge", "Challenge")
    ]
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=200, unique=True, blank=True, null=True)  # NEW: URL-friendly identifier
    description = models.TextField(blank=True)
    city = models.CharField(max_length=120)
    start_date = models.DateField()
    start_time = models.TimeField(default=datetime.min.time(), help_text="Tournament start time")
    end_date = models.DateField()
    end_time = models.TimeField(default=datetime.max.time(), help_text="Tournament end time")
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    first_prize = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="1st place prize amount (e.g., R2000)")
    second_prize = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="2nd place prize amount (e.g., R500)")
    third_prize = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True, help_text="3rd place prize amount (optional)")
    team_min = models.PositiveIntegerField(default=6)
    team_max = models.PositiveIntegerField(default=10)
    venue = models.ForeignKey(Venue, on_delete=models.PROTECT, related_name="tournaments", null=True, blank=True)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="organized_tournaments", null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="open")
    format = models.CharField(max_length=16, choices=FORMAT_CHOICES, default="league")
    hero_image = models.URLField(blank=True)
    
    # New optional marketing/branding fields
    tagline = models.CharField(max_length=180, blank=True)
    logo_url = models.URLField(blank=True)
    banner_image = models.URLField(blank=True)   # hero image (can reuse hero_image if already present)
    gallery_urls = models.TextField(blank=True)  # comma-separated image URLs for simplicity
    sponsors = models.TextField(blank=True)      # comma-separated "LogoURL|Name" entries
    rules_md = models.TextField(blank=True)      # markdown for rules & format
    prizes_md = models.TextField(blank=True)     # markdown for prizes
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    whatsapp_url = models.URLField(blank=True)   # e.g. https://wa.me/...
    registration_deadline = models.DateField(null=True, blank=True)
    published = models.BooleanField(default=True)
    
    # Wizard-specific fields for rules and structure configuration
    rules = models.JSONField(default=dict, blank=True)  # {win_pts, draw_pts, loss_pts, tiebreakers, max_players, duration_mins, extra_time, pens}
    structure = models.JSONField(default=dict, blank=True)  # {rounds, groups, knockout} - format-specific config

    def __str__(self): return self.name
    
    def save(self, *args, **kwargs):
        """Auto-generate slug from name if not provided"""
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            # Ensure uniqueness
            while Tournament.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

class Team(models.Model):
    name = models.CharField(max_length=160)
    manager_name = models.CharField(max_length=160)
    manager_email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    # Optional manager user link (additive)
    manager_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='managed_teams')
    # Simple derived metrics (additive)
    wins = models.PositiveIntegerField(default=0)
    draws = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    goals_for = models.PositiveIntegerField(default=0)
    goals_against = models.PositiveIntegerField(default=0)

    def __str__(self): return self.name

    @property
    def points(self):
        return self.wins * 3 + self.draws

class Registration(models.Model):
    STATUS_CHOICES = [("pending","Pending"),("paid","Paid"),("cancelled","Cancelled")]
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="registrations")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="registrations")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["team", "tournament"], name="unique_team_per_tournament")
        ]

# Fixtures generation hook (simple; can be expanded)
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Registration)
def maybe_generate_fixtures(sender, instance, created, **kwargs):
    if not created:
        return
    t = instance.tournament
    count = t.registrations.filter(status__in=["pending","paid"]).count()
    try:
        if count >= t.team_max and not t.matches.exists():
            generate_round_robin_fixtures(t)
    except Exception:
        # do not crash registration flow if generation fails
        pass

def generate_round_robin_fixtures(tournament):
    teams = list(Team.objects.filter(registrations__tournament=tournament).distinct())
    if len(teams) < 2:
        return
    # Add bye if odd
    if len(teams) % 2 == 1:
        teams.append(None)
    n = len(teams)
    rounds = n - 1
    half = n // 2
    from datetime import datetime, timedelta
    start = datetime.combine(tournament.start_date, datetime.min.time())
    arr = teams[:]
    for r in range(rounds):
        for i in range(half):
            t1 = arr[i]
            t2 = arr[n - 1 - i]
            if t1 is None or t2 is None:
                continue
            kickoff = start + timedelta(hours=r * 2 + i)
            Match.objects.create(
                tournament=tournament,
                home_team=t1,
                away_team=t2,
                kickoff_at=kickoff,
                pitch="",
                status="scheduled",
            )
        # rotate preserving first element
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]

class Referee(models.Model):
    """Referee model for managing match officials"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='referee_profile')
    username = models.CharField(max_length=100, unique=True)
    passcode = models.CharField(max_length=50)  # Simple passcode (can be hashed later)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.username})"

class Match(models.Model):
    STATUS_CHOICES=[("scheduled","Scheduled"),("live","Live"),("finished","Finished")]
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="matches")
    home_team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="home_matches")
    away_team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="away_matches")
    pitch = models.CharField(max_length=80, blank=True)
    kickoff_at = models.DateTimeField()
    home_score = models.PositiveIntegerField(default=0)
    away_score = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="scheduled")
    started_at = models.DateTimeField(null=True, blank=True, help_text="When match was started (set to live)")
    duration_minutes = models.PositiveIntegerField(null=True, blank=True, help_text="Match duration in minutes")

class MatchReferee(models.Model):
    """Link referees to matches for assignment"""
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='assigned_referees')
    referee = models.ForeignKey(Referee, on_delete=models.CASCADE, related_name='assigned_matches')
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_primary = models.BooleanField(default=True)  # Primary referee for the match
    
    class Meta:
        unique_together = ('match', 'referee')
    
    def __str__(self):
        return f"{self.referee.name} - {self.match}"

# New additive player structures
class Player(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='players')
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    goals = models.PositiveIntegerField(default=0)
    assists = models.PositiveIntegerField(default=0)
    clean_sheets = models.PositiveIntegerField(default=0)
    appearances = models.PositiveIntegerField(default=0)
    position = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()

class TeamPlayer(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='memberships')
    number = models.PositiveIntegerField(null=True, blank=True)
    is_captain = models.BooleanField(default=False)

    class Meta:
        unique_together = ('team', 'player')

class MatchScorer(models.Model):
    """Track which players scored in which matches"""
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='scorers')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='match_goals')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='match_scorers')
    minute = models.PositiveIntegerField(null=True, blank=True)  # Optional: minute of goal
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('match', 'player', 'minute')  # Allow same player multiple times if different minutes

# NEW: MatchAssist model to track assists linked to goals
class MatchAssist(models.Model):
    """Track assists for specific goals (linked to MatchScorer)"""
    goal = models.OneToOneField(MatchScorer, on_delete=models.CASCADE, related_name='assist', null=True, blank=True)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='assists')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='match_assists', null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='match_assists')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Allow multiple assists per match/team, but one per goal
        unique_together = ('goal',)  # One assist per goal

