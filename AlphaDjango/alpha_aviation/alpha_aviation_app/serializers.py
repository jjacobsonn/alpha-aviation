from rest_framework import serializers
from .models import Aircraft, Part, Company, Worker

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
        model = Part
        fields = ['part_number',
                  'name',
                  'description',
                  'aircraft',
                  'in_stock',
                  'last_inspected']

class CompanySerializer(serializers.ModelSerializer):
    class meta:
        model = Company
        fields =['name']

class WorkerSerializer(serializers.ModelSerializer):
    class meta:
        model = Worker
        fields = ['first_name',
                  'last_name',
                  'employee_ID',
                  'role']