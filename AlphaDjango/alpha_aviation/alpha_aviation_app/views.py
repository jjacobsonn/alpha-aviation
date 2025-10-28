from django.shortcuts import render, HttpResponse
from .models import Aircraft


# Create your views here.
def home(request):
    return render(request, "home.html")


def aircraft_specs(request):
    airplanes = Aircraft.objects.all()
    context = {"airplanes": airplanes}
    return render(request, "aircraft_specs.html", context)
