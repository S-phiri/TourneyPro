from django.db import models
from django.contrib.auth.models import User

class Venue(models.Model):
    name = models.CharField(max_length=120)
    city = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    map_link = models.URLField(blank=True)

    def __str__(self): return f"{self.name} – {self.city}"

class Tournament(models.Model):
    STATUS_CHOICES = [("draft","Draft"),("open","Open"),("closed","Closed"),("completed","Completed")]
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    city = models.CharField(max_length=120)
    start_date = models.DateField()
    end_date = models.DateField()
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    team_min = models.PositiveIntegerField(default=6)
    team_max = models.PositiveIntegerField(default=10)
    venue = models.ForeignKey(Venue, on_delete=models.PROTECT, related_name="tournaments")
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="organized_tournaments", null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="open")
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

    def __str__(self): return self.name

class Team(models.Model):
    name = models.CharField(max_length=160)
    manager_name = models.CharField(max_length=160)
    manager_email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)

    def __str__(self): return self.name

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

class Match(models.Model):
    STATUS_CHOICES=[("scheduled","Scheduled"),("finished","Finished")]
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="matches")
    home_team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="home_matches")
    away_team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="away_matches")
    pitch = models.CharField(max_length=80, blank=True)
    kickoff_at = models.DateTimeField()
    home_score = models.PositiveIntegerField(default=0)
    away_score = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="scheduled")
