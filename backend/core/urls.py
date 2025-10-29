# core/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from tournaments.views import VenueViewSet, TournamentViewSet, TeamViewSet, RegistrationViewSet, MatchViewSet, UserView, RegisterView

router = DefaultRouter()
router.register(r'venues', VenueViewSet)
router.register(r'tournaments', TournamentViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'registrations', RegistrationViewSet, basename="registrations")
router.register(r'matches', MatchViewSet, basename="matches")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    # JWT Authentication endpoints
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/auth/user/', UserView.as_view(), name='user_detail'),
    path('api/auth/register/', RegisterView.as_view(), name='user_register'),
]
