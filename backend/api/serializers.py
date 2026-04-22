from rest_framework import serializers
from django.utils import timezone
from .models import (
    AircraftMaintenanceInterval,
    AircraftPhoto,
    Company,
    Profile,
    Aircraft,
    Part,
    Discrepancy,
    DiscrepancyActivity,
    WorkOrder,
    WorkOrderActivity,
    WorkOrderPart,
    Flight,
    Inventory,
    InventoryPart,
)
from .maintenance_activity import (
    log_discrepancy_created,
    log_discrepancy_updated,
    log_work_order_created,
    log_work_order_updated,
    snapshot_discrepancy,
    snapshot_work_order,
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


class WorkOrderActivitySerializer(serializers.ModelSerializer):
    actor_display = serializers.SerializerMethodField()

    class Meta:
        model = WorkOrderActivity
        fields = ["id", "actor", "actor_display", "created_at", "event_type", "summary"]

    def get_actor_display(self, obj):
        a = obj.actor
        if not a:
            return "System"
        fn = (a.first_name or "").strip()
        ln = (a.last_name or "").strip()
        full = f"{fn} {ln}".strip()
        return full or (a.username or "").strip() or str(a.id)


class DiscrepancyActivitySerializer(serializers.ModelSerializer):
    actor_display = serializers.SerializerMethodField()

    class Meta:
        model = DiscrepancyActivity
        fields = ["id", "actor", "actor_display", "created_at", "event_type", "summary"]

    def get_actor_display(self, obj):
        a = obj.actor
        if not a:
            return "System"
        fn = (a.first_name or "").strip()
        ln = (a.last_name or "").strip()
        full = f"{fn} {ln}".strip()
        return full or (a.username or "").strip() or str(a.id)


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
    activities = DiscrepancyActivitySerializer(many=True, read_only=True)

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
            "activities",
        ]

    def create(self, validated_data):
        instance = super().create(validated_data)
        log_discrepancy_created(instance, self.context.get("request"))
        return instance

    def update(self, instance, validated_data):
        before = snapshot_discrepancy(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if (
            user
            and user.is_authenticated
            and getattr(user, "company_role", None) == "mechanic"
            and not (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
        ):
            validated_data.pop("aircraft", None)
            validated_data.pop("reporter", None)
            validated_data.pop("work_order", None)
        instance = super().update(instance, validated_data)
        log_discrepancy_updated(instance, before, snapshot_discrepancy(instance), request)
        return instance


class WorkOrderSerializer(serializers.ModelSerializer):
    """
    `parts_needed` is a M2M through `WorkOrderPart` (each row requires a quantity).
    API accepts a list of part PKs; each selected part is stored with quantity=1.
    """

    parts_needed = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Part.objects.all(), required=False, allow_empty=True
    )
    activities = WorkOrderActivitySerializer(many=True, read_only=True)
    ALLOWED_STATUS_TRANSITIONS = {
        "open": {"open", "in_progress", "awaiting_parts", "closed"},
        "in_progress": {"in_progress", "awaiting_parts", "closed"},
        "awaiting_parts": {"awaiting_parts", "in_progress", "closed"},
        "closed": {"closed"},
    }

    class Meta:
        model = WorkOrder
        fields = [
            "id",
            "title",
            "created_by",
            "description",
            "parts_needed",
            "status",
            "priority",
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
            "activities",
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

        current_status = getattr(self.instance, "status", None) or "open"
        next_status = data.get("status", current_status)
        allowed = self.ALLOWED_STATUS_TRANSITIONS.get(current_status, {current_status})
        if next_status not in allowed:
            raise serializers.ValidationError(
                {
                    "status": (
                        f"Invalid status transition from '{current_status}' to '{next_status}'."
                    )
                }
            )

        request = self.context.get("request")
        request_user = getattr(request, "user", None) if request else None
        default_assignee = (
            request_user
            if request_user is not None and getattr(request_user, "is_authenticated", False)
            else None
        )
        assignee = data.get(
            "created_by",
            getattr(self.instance, "created_by", None) or default_assignee,
        )
        if next_status != "open" and assignee is None:
            raise serializers.ValidationError(
                {"created_by": "Assign a mechanic before moving work order out of Open."}
            )
        return data

    def create(self, validated_data):
        parts = validated_data.pop("parts_needed", [])
        work_order = WorkOrder.objects.create(**validated_data)
        for part in parts:
            WorkOrderPart.objects.create(work_order=work_order, part=part, quantity=1)
        log_work_order_created(work_order, self.context.get("request"))
        return work_order

    def update(self, instance, validated_data):
        before = snapshot_work_order(instance)
        parts = validated_data.pop("parts_needed", None)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if (
            user
            and user.is_authenticated
            and getattr(user, "company_role", None) == "mechanic"
            and not (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
        ):
            # Mechanics update execution (progress, parts, dates); supervisors own assignment & structure.
            validated_data.pop("created_by", None)
            validated_data.pop("aircraft", None)
            validated_data.pop("title", None)
        work_order = super().update(instance, validated_data)
        if parts is not None:
            WorkOrderPart.objects.filter(work_order=work_order).delete()
            for part in parts:
                WorkOrderPart.objects.create(
                    work_order=work_order, part=part, quantity=1
                )
        work_order.refresh_from_db()
        after = snapshot_work_order(work_order)
        log_work_order_updated(work_order, before, after, request)
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


class AircraftPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AircraftPhoto
        fields = ["id", "image", "caption", "sort_order"]


class AircraftMaintenanceIntervalSerializer(serializers.ModelSerializer):
    hours_remaining = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    compliance_status = serializers.SerializerMethodField()
    severity_color = serializers.SerializerMethodField()

    class Meta:
        model = AircraftMaintenanceInterval
        fields = [
            "id",
            "aircraft",
            "name",
            "interval_type",
            "due_every_hours",
            "due_every_days",
            "last_done_tach",
            "last_done_hobbs",
            "last_done_date",
            "is_ad",
            "ad_number",
            "ad_revision",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
            "hours_remaining",
            "days_remaining",
            "compliance_status",
            "severity_color",
        ]
        read_only_fields = ["aircraft", "created_at", "updated_at"]

    def get_hours_remaining(self, obj):
        if obj.due_every_hours in (None, ""):
            return None
        current_tach = getattr(obj.aircraft, "tach_current", None)
        if current_tach is None or obj.last_done_tach is None:
            return None
        return round(float(obj.due_every_hours) - (float(current_tach) - float(obj.last_done_tach)), 1)

    def get_days_remaining(self, obj):
        if obj.due_every_days in (None, "") or obj.last_done_date is None:
            return None
        elapsed = (timezone.now().date() - obj.last_done_date).days
        return int(obj.due_every_days) - elapsed

    def get_compliance_status(self, obj):
        hours_remaining = self.get_hours_remaining(obj)
        days_remaining = self.get_days_remaining(obj)
        values = [v for v in [hours_remaining, days_remaining] if v is not None]
        if not values:
            return "ok"
        if any(v < 0 for v in values):
            return "overdue"
        if any(v <= 10 for v in [hours_remaining] if v is not None) or any(
            v <= 7 for v in [days_remaining] if v is not None
        ):
            return "due_soon"
        return "ok"

    def get_severity_color(self, obj):
        status = self.get_compliance_status(obj)
        if status == "overdue":
            return "red"
        if status == "due_soon":
            return "amber"
        return "green"


class FleetAircraftListSerializer(serializers.ModelSerializer):
    interval_summary = serializers.SerializerMethodField()

    class Meta:
        model = Aircraft
        fields = [
            "id",
            "registration_number",
            "model",
            "location",
            "tach_current",
            "hobbs_current",
            "fleet_status",
            "aircraft_type",
            "interval_summary",
        ]

    def get_interval_summary(self, obj):
        intervals = obj.maintenance_intervals.filter(is_active=True)
        serializer = AircraftMaintenanceIntervalSerializer(
            intervals, many=True, context=self.context
        )
        overdue_count = 0
        due_soon_count = 0
        ok_count = 0
        for row in serializer.data:
            status = row.get("compliance_status")
            if status == "overdue":
                overdue_count += 1
            elif status == "due_soon":
                due_soon_count += 1
            else:
                ok_count += 1
        return {
            "overdue_count": overdue_count,
            "due_soon_count": due_soon_count,
            "ok_count": ok_count,
        }


class FleetAircraftDetailSerializer(serializers.ModelSerializer):
    photos = AircraftPhotoSerializer(many=True, read_only=True)
    links = serializers.SerializerMethodField()

    class Meta:
        model = Aircraft
        fields = [
            "id",
            "registration_number",
            "model",
            "manufacturer",
            "engine_type",
            "year_built",
            "location",
            "tach_current",
            "hobbs_current",
            "fleet_status",
            "aircraft_type",
            "specs",
            "photos",
            "links",
        ]

    def get_links(self, obj):
        return {
            "open_workorders_count": obj.work_orders.exclude(status="closed").count(),
            "open_discrepancies_count": obj.discrepancies.exclude(status="closed").count(),
            "recent_flights_count": obj.flights.count(),
        }

