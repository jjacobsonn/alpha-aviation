from django.urls import path, include  
from rest_framework.routers import DefaultRouter
from .views import AircraftViewSet,PartViewSet, home, CompanyViewSet, WorkerViewSet

router = DefaultRouter()

router.register(r'aircraft', AircraftViewSet)
router.register(r'part', PartViewSet)
router.register(r'company', CompanyViewSet)
router.register(r'worker', WorkerViewSet)


urlpatterns = [
    path('api/', include(router.urls)),
    path("", home, name="home")
]

"""
old test url patterns

path("", views.home, name="home"),
path("aircraft/", views.aircraft_specs, name="Aircraft")
"""
