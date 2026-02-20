from django.urls import path
from .views import health, login, token_refresh, logout, user_profile

urlpatterns = [
    path('health/', health, name='health'),
    path('auth/login/', login, name='login'),
    path('auth/token/refresh/', token_refresh, name='token_refresh'),
    path('auth/logout/', logout, name='logout'),
    path('users/me/', user_profile, name='user_profile'),
]
