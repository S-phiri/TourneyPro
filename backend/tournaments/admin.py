from django.contrib import admin
from .models import Venue, Tournament, Team, Registration, Match
admin.site.register(Venue)
admin.site.register(Tournament)
admin.site.register(Team)
admin.site.register(Registration)
admin.site.register(Match)
