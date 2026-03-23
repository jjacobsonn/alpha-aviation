from rest_framework import serializers
from .models import (
    Company,
    Profile,
    Aircraft,
    Part,
    Discrepancy,
    WorkOrder,
    Flight,
    Inventory,
)


####
# User Profile
####

#
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "created_at",
            "updated_at",
            "locations",
        ]

class ProfileSerializer(serializers.ModelSerializer):
    # ProfileSerializer shape is inherited from dev-ek/serializers and may rely
    # on related role-specific models (Pilot/Mechanic) for some fields.
    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "middle_name",
            "email",
            "employee_id",
            "phone_number",
            "company",
            "company_role",
            "medically_cleared_until",
            "pilot_certificate",
            "AP_certificate_number",
            "inspector_authentication",
        ]
    #if user is not pilot or not mechanic it will remove those fields from the response.
    def to_representation(self, instance):
        data = super().to_representation(instance)

        if not instance.is_pilot():
            data.pop('medically_cleared_until', None)
            data.pop('pilot_certificate', None)
        
        if not instance.is_mechanic():
            data.pop('AP_certificate_number', None)
            data.pop('inspector_authentication', None)

        return data


####
# Maintenance Dashboard
####


class AircraftSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Aircraft
        fields = [
            "id",
            "registration_number",
            "model",
            "manufacturer",
            "engine_type",
            "year_built",
            "company",
            "company_name",
        ]

class PartSerializer(serializers.ModelSerializer):
    aircraft_name = serializers.CharField(source="aircraft.model", read_only=True)

    class Meta:
        model = Part
        fields = [
            "id",
            "part_number",
            "name",
            "description",
            "aircraft",
            "aircraft_name",
        ]

class DiscrepancySerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source="reporter.username", read_only=True)

    class Meta:
        model = Discrepancy
        fields = [
            "id",
            "work_order",
            "aircraft",
            "reporter",
            "reporter_name",
            "date_reported",
            "description",
            "ata_code",
            "tach_time",
            "status",
        ]

class WorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        fields = [
            "id",
            "title",
            "created_by",
            "description",
            "parts_needed",
            "status",
            "created_at",
            "updated_at",
            "due_by",
            "aircraft",
            "tach_time",
            "hobbs_time",
            "ATA_code",
            "components_affected",
            "components_image",
            "signed_by",
            "signature",
            "signature_date",
        ]

class FlightSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    aircraft_name = serializers.CharField(source="aircraft.model", read_only=True)

    class Meta:
        model = Flight
        fields = [
            "id",
            "company",
            "aircraft",
            "flight_number",
            "origin",
            "destination",
            "departure_time",
            "arrival_time",
            "route",
            "flight_type",
            "primary_pilot",
            "secondary_pilot",
            "pilot_requirement",
            "approved",
            "company_name",
            "aircraft_name",
        ]


####
# Inventory
####


class InventorySerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    part = PartSerializer(read_only=True)
    part_id = serializers.PrimaryKeyRelatedField(
        source="part", queryset=Part.objects.all(), write_only=True
    )

    class Meta:
        model = Inventory
        fields = [
            "id",
            "company",
            "part",
            "part_id",
            "last_inspected",
            "inspection_due_in",
            "in_stock",
            "stock_alert",
            "stock_alert_percentage",
            "shop_location",
        ]

