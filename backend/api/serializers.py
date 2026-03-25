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
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    medically_cleared_until = serializers.DateField(
        source="pilot_info.medically_cleared_until", required=False, allow_null=True
    )
    pilot_certificate = serializers.CharField(
        source="pilot_info.pilot_certificate", required=False, allow_blank=True
    )
    AP_certificate_number = serializers.IntegerField(
        source="mechanic_info.AP_certificate_number", required=False, allow_null=True
    )
    inspector_authentication = serializers.BooleanField(
        source="mechanic_info.inspector_authentication", required=False
    )
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    platform_role = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "middle_name",
            "email",
            "employee_id",
            "phone_number",
            "company",
            "company_role",
            "is_staff",
            "is_superuser",
            "platform_role",
            "medically_cleared_until",
            "pilot_certificate",
            "AP_certificate_number",
            "inspector_authentication",
        ]

    def get_platform_role(self, obj):
        if getattr(obj, "is_superuser", False):
            return "superuser"
        if getattr(obj, "is_staff", False):
            return "admin"
        return getattr(obj, "company_role", None)

    def create(self, validated_data):
        pilot_data = validated_data.pop("pilot_info", None) or {}
        mechanic_data = validated_data.pop("mechanic_info", None) or {}
        raw_password = validated_data.pop("password", "")
        user = Profile(**validated_data)
        if raw_password:
            user.set_password(raw_password)
        else:
            user.set_unusable_password()
        user.save()

        # Only set role-specific data if it applies (and the related row exists).
        if getattr(user, "company_role", None) == "pilot" and pilot_data and hasattr(
            user, "pilot_info"
        ):
            for k, v in pilot_data.items():
                setattr(user.pilot_info, k, v)
            user.pilot_info.save()
        if (
            getattr(user, "company_role", None) == "mechanic"
            and mechanic_data
            and hasattr(user, "mechanic_info")
        ):
            for k, v in mechanic_data.items():
                setattr(user.mechanic_info, k, v)
            user.mechanic_info.save()

        return user

    def update(self, instance, validated_data):
        pilot_data = validated_data.pop("pilot_info", None) or {}
        mechanic_data = validated_data.pop("mechanic_info", None) or {}
        raw_password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if raw_password is not None and raw_password != "":
            instance.set_password(raw_password)
        instance.save()

        # Update role-specific models when present.
        if pilot_data and hasattr(instance, "pilot_info"):
            for k, v in pilot_data.items():
                setattr(instance.pilot_info, k, v)
            instance.pilot_info.save()
        if mechanic_data and hasattr(instance, "mechanic_info"):
            for k, v in mechanic_data.items():
                setattr(instance.mechanic_info, k, v)
            instance.mechanic_info.save()

        return instance


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

