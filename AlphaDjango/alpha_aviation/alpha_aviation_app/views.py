from rest_framework import viewsets
from .models import Aircraft, Part
from .serializers import AircraftSerializer, PartSerializer

# Create your views here.
"""
old test views
from django.shortcuts import render, HttpResponse
from .models import Aircraft

def home(request):
    return render(request, "home.html")


def aircraft_specs(request):
    airplanes = Aircraft.objects.all()
    context = {"airplanes": airplanes}
    return render(request, "aircraft_specs.html", context)
"""

class AircraftViewSet(viewsets.ModelViewSet):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer

class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
