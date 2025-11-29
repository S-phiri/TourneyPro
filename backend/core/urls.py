# core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from tournaments.views import VenueViewSet, TournamentViewSet, TeamViewSet, RegistrationViewSet, MatchViewSet, UserView, RegisterView, PlayerViewSet, TeamPlayerViewSet, RegisterManagerView, RestrictedTokenObtainPairView

router = DefaultRouter()
router.register(r'venues', VenueViewSet)
router.register(r'tournaments', TournamentViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'registrations', RegistrationViewSet, basename="registrations")
router.register(r'matches', MatchViewSet, basename="matches")
router.register(r'players', PlayerViewSet, basename="players")
router.register(r'teamplayers', TeamPlayerViewSet, basename="teamplayers")

def root_view(request):
    """Root endpoint - simple health check"""
    return JsonResponse({
        'status': 'ok',
        'message': 'Tournament API is running',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'auth': '/api/auth/login/'
        }
    })

urlpatterns = [
    # Root path - fixes 404 on "/"
    path('', root_view, name='root'),
    
    # Admin panel
    path('admin/', admin.site.urls),
    
    # API routes
    path('api/', include(router.urls)),
    
    # JWT Authentication endpoints (restricted to Benson only)
    path('api/auth/login/', RestrictedTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/auth/me/', UserView.as_view(), name='user_me'),
    path('api/auth/user/', UserView.as_view(), name='user_detail'),  # Keep for backward compatibility
    path('api/auth/register/', RegisterView.as_view(), name='user_register'),
    path('api/auth/register-manager/', RegisterManagerView.as_view(), name='register_manager'),
]
