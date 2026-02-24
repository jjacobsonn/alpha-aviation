from rest_framework import serializers
from .models import (
    Company, Profile, Aircraft, Part,
    Discrepancy, WorkOrder
)


####
# User Profile
####


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            'id', 'username', 'first_name', 'last_name', 'middle_name',
            'email', 'employee_id', 'phone_number',
            'company', 'company_role',
            'medically_cleared_until', 'pilot_certificate',
            'AP_certificate_number', 'inspector_authentication',
        ]


####
# Maintenance Dashboard
####


class AircraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = '__all__'


class PartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Part
        fields = '__all__'


class DiscrepancySerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)

    class Meta:
        model = Discrepancy
        fields = '__all__'


class WorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        fields = [
            'id', 'title', 'created_by', 'description', 'parts_needed',
            'status', 'created_at', 'updated_at', 'due_by', 'aircraft',
            'tach_time', 'hobbs_time', 'ATA_code', 'components_affected',
            'components_image', 'signed_by', 'signature', 'signature_date',
        ]
