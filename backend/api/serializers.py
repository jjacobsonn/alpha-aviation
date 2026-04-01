from rest_framework import serializers
from .models import (
    Company,
    Profile,
    Aircraft,
    Part,
    Discrepancy,
    WorkOrder,
    WorkOrderPart,
    Flight,
    Inventory,
    InventoryPart,
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
    """
    `parts_needed` is a M2M through `WorkOrderPart` (each row requires a quantity).
    API accepts a list of part PKs; each selected part is stored with quantity=1.
    """

    parts_needed = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Part.objects.all(), required=False, allow_empty=True
    )

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

    def validate(self, data):
        aircraft = data.get("aircraft") or getattr(self.instance, "aircraft", None)
        parts = data.get("parts_needed")
        if parts is not None and aircraft:
            invalid = [p for p in parts if p.aircraft_id and p.aircraft_id != aircraft.id]
            if invalid:
                raise serializers.ValidationError(
                    {
                        "parts_needed": "One or more parts are not catalogued for the selected aircraft."
                    }
                )
        return data

    def create(self, validated_data):
        parts = validated_data.pop("parts_needed", [])
        work_order = WorkOrder.objects.create(**validated_data)
        for part in parts:
            WorkOrderPart.objects.create(work_order=work_order, part=part, quantity=1)
        return work_order

    def update(self, instance, validated_data):
        parts = validated_data.pop("parts_needed", None)
        work_order = super().update(instance, validated_data)
        if parts is not None:
            WorkOrderPart.objects.filter(work_order=work_order).delete()
            for part in parts:
                WorkOrderPart.objects.create(
                    work_order=work_order, part=part, quantity=1
                )
        return work_order


class FlightSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    aircraft_name = serializers.CharField(source="aircraft.model", read_only=True)
    # Frontend still uses `approved`; DB stores workflow as `status`.
    approved = serializers.SerializerMethodField()

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
            "dispatcher",
            "status",
            "approved",
            "company_name",
            "aircraft_name",
        ]

    def get_approved(self, obj):
        return getattr(obj, "status", None) == "approved"

    def validate(self, attrs):
        attrs = super().validate(attrs)
        initial = getattr(self, "initial_data", None) or {}
        if "approved" in initial:
            if initial.get("approved") is True:
                attrs["status"] = "approved"
            elif initial.get("approved") is False and "status" not in attrs:
                attrs.setdefault("status", "pending approval")
        return attrs


####
# Inventory
####


class InventorySerializer(serializers.ModelSerializer):
    """
    One row per part line (InventoryPart). Exposes `company` and `in_stock` names
    the frontend already expects.
    """

    company = CompanySerializer(source="inventory.company", read_only=True)
    part = PartSerializer(read_only=True)
    part_id = serializers.PrimaryKeyRelatedField(
        source="part", queryset=Part.objects.all(), write_only=True, required=False
    )
    # Read/write `in_stock` maps to model `quantity` for API compatibility.
    in_stock = serializers.IntegerField(source="quantity", required=False)

    class Meta:
        model = InventoryPart
        fields = [
            "id",
            "inventory",
            "company",
            "part",
            "part_id",
            "in_stock",
            "stock_alert",
            "stock_alert_percentage",
            "shop_location",
        ]

