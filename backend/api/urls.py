from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    health, login, token_refresh, logout, user_profile,
    CompanyViewSet, ProfileViewSet, AircraftViewSet,
    PartViewSet, DiscrepancyViewSet, WorkOrderViewSet
)

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'profiles', ProfileViewSet, basename='profiles')
router.register(r'aircraft', AircraftViewSet, basename='aircraft')
router.register(r'parts', PartViewSet, basename='parts')
router.register(r'discrepancies', DiscrepancyViewSet, basename='discrepancies')
router.register(r'workorders', WorkOrderViewSet, basename='workorders')

urlpatterns = [
    path('health/', health, name='health'),
    path('auth/login/', login, name='login'),
    path('auth/token/refresh/', token_refresh, name='token_refresh'),
    path('auth/logout/', logout, name='logout'),
    path('users/me/', user_profile, name='user_profile'),
    path('', include(router.urls)),
    
]
