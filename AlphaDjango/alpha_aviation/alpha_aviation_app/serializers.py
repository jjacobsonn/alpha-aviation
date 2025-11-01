from rest_framework import serializers
from .models import Aircraft, Part

class AircraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = ['registration_number',
                  'model',
                  'manufacturer',
                  'engine_type',
                  'year_built']
        
class PartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = ['part_number',
                  'name',
                  'description',
                  'aircraft',
                  'in_stock',
                  'last_inspected']