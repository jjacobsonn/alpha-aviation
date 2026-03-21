from rest_framework import serializers
from .models import (
    Company, Profile, Aircraft, Part,
    Discrepancy, WorkOrder, Flight
)


####
# User Profile
####


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'created_at', 'updated_at', 'locations',
        ]


class ProfileSerializer(serializers.ModelSerializer):
    # ProfileSerializer — medically_cleared_until, pilot_certificate,
    # AP_certificate_number, and inspector_authentication don't exist
    # on the Profile model
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
    # display field added - CHECK - Not yet included in fields
    company_name = serializers.CharField(source='company.name', read_only=True)
    is_ready_to_fly = serializers.BooleanField(read_only=True)

    class Meta:
        model = Aircraft
        fields = [
            'id', 'registration_number', 'model', 'manufacturer',
            'engine_type', 'year_built', 'company', 'is_ready_to_fly',
        ]


class PartSerializer(serializers.ModelSerializer):
    # display field added - CHECK - Not yet included in fields
    aircraft_name = serializers.CharField(source='aircraft.model', read_only=True)
    class Meta:
        model = Part
        fields = [
            'id', 'part_number', 'name', 'description', 'aircraft',
        ]


class DiscrepancySerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)

    class Meta:
        model = Discrepancy
        fields = [
            'id', 'work_order', 'aircraft', 'reporter', 'reporter_name',
            'date_reported', 'description', 'ata_code', 'tach_time', 'status',
        ]


class WorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        fields = [
            'id', 'title', 'created_by', 'description', 'parts_needed',
            'status', 'created_at', 'updated_at', 'due_by', 'aircraft',
            'tach_time', 'hobbs_time', 'ATA_code', 'components_affected',
            'components_image', 'signed_by', 'signature', 'signature_date',
        ]


class FlightSerializer(serializers.ModelSerializer):
    # display field added - CHECK - Not yet included in fields
    company_name = serializers.CharField(source='company.name', read_only=True)
    aircraft_name = serializers.CharField(source='aircraft.model', read_only=True)
    class Meta:
        model = Flight
        fields = [
            'id', 'company', 'aircraft', 'flight_number', 'origin',
            'destination', 'departure_time', 'arrival_time', 'route',
            'flight_type', 'primary_pilot', 'secondary_pilot',
            'pilot_requirement', 'approved',
        ]