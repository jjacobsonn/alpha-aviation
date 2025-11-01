from django.urls import path, include  
from rest_framework.routers import DefaultRouter
from .views import AircraftViewSet,PartViewSet

router = DefaultRouter()

router.register(r'aircraft', AircraftViewSet)
router.register(r'part', PartViewSet)


urlpatterns = [
    path('api/', include(router.urls))
]

"""
old test url patterns

path("", views.home, name="home"),
path("aircraft/", views.aircraft_specs, name="Aircraft")
"""
