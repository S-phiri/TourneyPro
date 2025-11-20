from django.contrib import admin
from .models import Venue, Tournament, Team, Registration, Match, Player, TeamPlayer, MatchScorer, MatchAssist
admin.site.register(Venue)
admin.site.register(Tournament)
admin.site.register(Team)
admin.site.register(Registration)
admin.site.register(Match)
admin.site.register(Player)
admin.site.register(TeamPlayer)
admin.site.register(MatchScorer)
admin.site.register(MatchAssist)  # NEW: Register MatchAssist model
