from django.db.models import Q
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
    FlightActivity,
    Inventory,
    Tool,
    CalibrationRecord,
    InventoryPart,
    InstalledComponent,
    ComponentEvent,
    ComponentHistoryActivity,
    LaborEntry,
)
from .maintenance_activity import (
    log_discrepancy_created,
    log_discrepancy_updated,
    log_flight_created,
    log_flight_updated,
    log_work_order_created,
    log_work_order_updated,
    snapshot_discrepancy,
    snapshot_flight,
    snapshot_work_order,
)


def profile_display_name(profile):
    """First + last name, else username — never expose raw username when a name exists."""
    if not profile:
        return ""
    fn = (profile.first_name or "").strip()
    ln = (profile.last_name or "").strip()
    full = f"{fn} {ln}".strip()
    return full or (profile.username or "").strip() or ""


def profile_to_dict(profile):
    if not profile:
        return None
    fn = (profile.first_name or "").strip()
    ln = (profile.last_name or "").strip()
    return {
        "id": profile.id,
        "first_name": fn,
        "last_name": ln,
        "username": profile.username or "",
        "display_name": profile_display_name(profile),
    }


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

class SelfProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Fields a signed-in user may change on their own account (task 1.3.1 contact info).
    """

    class Meta:
        model = Profile
        fields = ("first_name", "last_name", "email", "phone_number", "middle_name")

    def validate_phone_number(self, value):
        if value in (None, ""):
            return ""
        s = str(value).strip()
        if len(s) > 10:
            raise serializers.ValidationError("Phone number must be at most 10 characters.")
        return s


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
        if getattr(instance, "is_superuser", False) or getattr(instance, "is_staff", False):
            validated_data.pop("company_role", None)
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
            "location",
            "tach_current",
            "hobbs_current",
            "fleet_status",
            "aircraft_type",
            "specs",
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
    reporter_name = serializers.SerializerMethodField()
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
            "signature",
            "signature_date",
            "activities",
        ]

    def get_reporter_name(self, obj):
        return profile_display_name(obj.reporter)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        ac = instance.aircraft
        if ac:
            rep["aircraft"] = {
                "id": ac.id,
                "registration_number": ac.registration_number or "",
                "model": ac.model or "",
            }
        rp = instance.reporter
        if rp:
            rep["reporter"] = profile_to_dict(rp)
        rep["reporter_name"] = profile_display_name(rp)
        wo = instance.work_order
        if wo:
            rep["work_order"] = {
                "id": wo.id,
                "title": wo.title or "",
                "status": wo.status or "",
                "created_by": profile_to_dict(wo.created_by),
                "assignee": profile_to_dict(wo.assignee),
                "created_by_name": profile_display_name(wo.created_by),
                "assignee_name": profile_display_name(wo.assignee)
                or profile_display_name(wo.created_by),
            }
        return rep

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


def serialize_work_order_parts(work_order):
    """Read representation for M2M through WorkOrderPart."""
    rows = []
    for link in work_order.workorderpart_set.select_related("part").all():
        part = link.part
        rows.append(
            {
                "id": part.id,
                "part_number": part.part_number,
                "name": part.name,
                "quantity": link.quantity,
            }
        )
    return rows


class LaborEntrySerializer(serializers.ModelSerializer):
    mechanic_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LaborEntry
        fields = [
            "id",
            "work_order",
            "mechanic",
            "mechanic_name",
            "hours",
            "work_date",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "work_order", "created_by", "created_at", "updated_at"]

    def get_mechanic_name(self, obj):
        return profile_display_name(obj.mechanic)

    def get_created_by_name(self, obj):
        return profile_display_name(obj.created_by)

    def validate_hours(self, value):
        if value is None or float(value) <= 0:
            raise serializers.ValidationError("Hours must be greater than zero.")
        if float(value) > 24:
            raise serializers.ValidationError("Hours cannot exceed 24 per entry.")
        return value


class WorkOrderSerializer(serializers.ModelSerializer):
    """
    `parts_needed` is a M2M through `WorkOrderPart` (each row requires a quantity).
    API accepts a list of part PKs; each selected part is stored with quantity=1.
    """

    parts_needed = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Part.objects.all(), required=False, allow_empty=True
    )
    activities = WorkOrderActivitySerializer(many=True, read_only=True)
    ALL_VALID_STATUSES = {"open", "in_progress", "awaiting_parts", "closed"}

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
            "assignee",
            "priority",
            "completion_notes",
            "activities",
        ]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        ac = instance.aircraft
        if ac:
            rep["aircraft"] = {
                "id": ac.id,
                "registration_number": ac.registration_number or "",
                "model": ac.model or "",
            }
        cb = instance.created_by
        if cb:
            rep["created_by"] = profile_to_dict(cb)
        assignee = instance.assignee
        if assignee:
            rep["assignee"] = profile_to_dict(assignee)
        rep["created_by_name"] = profile_display_name(cb)
        rep["assignee_name"] = profile_display_name(assignee) or profile_display_name(cb)
        sb = instance.signed_by
        if sb:
            rep["signed_by"] = profile_to_dict(sb)
        rep["parts_needed"] = serialize_work_order_parts(instance)
        latest = instance.activities.first()
        if latest:
            actor = latest.actor
            if actor:
                fn = (actor.first_name or "").strip()
                ln = (actor.last_name or "").strip()
                rep["last_edited_by"] = f"{fn} {ln}".strip() or (actor.username or "")
            else:
                rep["last_edited_by"] = "System"
            rep["last_edited_at"] = latest.created_at
        else:
            rep["last_edited_by"] = None
            rep["last_edited_at"] = None
        from .labor_utils import work_order_labor_total

        entries = instance.labor_entries.select_related("mechanic", "created_by").all()
        rep["labor_entries"] = LaborEntrySerializer(entries, many=True).data
        total = work_order_labor_total(instance)
        rep["labor_hours_total"] = round(total, 2) if total else None
        return rep

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
        if next_status not in self.ALL_VALID_STATUSES:
            raise serializers.ValidationError(
                {"status": f"'{next_status}' is not a valid work order status."}
            )

        request = self.context.get("request")
        request_user = getattr(request, "user", None) if request else None
        default_assignee = (
            request_user
            if request_user is not None and getattr(request_user, "is_authenticated", False)
            else None
        )
        effective_assignee = data.get("assignee")
        if effective_assignee is None and "created_by" in data:
            effective_assignee = data.get("created_by")
        if effective_assignee is None:
            inst = self.instance
            effective_assignee = (
                getattr(inst, "assignee", None) if inst else None
            ) or (getattr(inst, "created_by", None) if inst else None)
        if effective_assignee is None:
            effective_assignee = default_assignee
        if next_status != "open" and effective_assignee is None:
            raise serializers.ValidationError(
                {
                    "assignee": "Assign a mechanic before moving work order out of Open."
                }
            )
        return data

    def create(self, validated_data):
        parts = validated_data.pop("parts_needed", [])
        work_order = WorkOrder.objects.create(**validated_data)
        for part in parts:
            WorkOrderPart.objects.create(work_order=work_order, part=part, quantity=1)
        log_work_order_created(work_order, self.context.get("request"))
        return work_order

    _WO_SUPERVISOR_ONLY_FIELDS = (
        "created_by",
        "aircraft",
        "title",
        "ATA_code",
        "components_affected",
        "components_image",
        "tach_time",
        "hobbs_time",
        "signed_by",
        "signature",
        "signature_date",
    )

    def update(self, instance, validated_data):
        before = snapshot_work_order(instance)
        parts = validated_data.pop("parts_needed", None)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        role = getattr(user, "company_role", None) if user else None
        is_admin = bool(
            user
            and user.is_authenticated
            and (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
        )
        if user and user.is_authenticated and not is_admin and role not in {"owner", "manager"}:
            # Mechanics/dispatchers: progress, parts, dates, description only.
            for field in self._WO_SUPERVISOR_ONLY_FIELDS:
                validated_data.pop(field, None)
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


class FlightActivitySerializer(serializers.ModelSerializer):
    actor_display = serializers.SerializerMethodField()

    class Meta:
        model = FlightActivity
        fields = ["id", "actor", "actor_display", "created_at", "event_type", "summary"]

    def get_actor_display(self, obj):
        a = obj.actor
        if not a:
            return "System"
        fn = (a.first_name or "").strip()
        ln = (a.last_name or "").strip()
        full = f"{fn} {ln}".strip()
        return full or (a.username or "").strip() or str(a.id)


class FlightSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    aircraft_name = serializers.CharField(source="aircraft.model", read_only=True)
    activities = FlightActivitySerializer(many=True, read_only=True)
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
            "activities",
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
    inventory = serializers.PrimaryKeyRelatedField(read_only=True)
    part_id = serializers.PrimaryKeyRelatedField(
        source="part", queryset=Part.objects.all(), write_only=True, required=True
    )
    # Read/write `in_stock` maps to model `quantity` for API compatibility.
    in_stock = serializers.IntegerField(source="quantity", required=False)
    tracked_units_count = serializers.IntegerField(read_only=True)

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
            "tracked_units_count",
        ]


####
# Tool & Equipment
####


class CalibrationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalibrationRecord
        fields = [
            "id",
            "tool",
            "calibration_date",
            "performed_by",
            "next_due_date",
            "notes",
        ]
        read_only_fields = ["tool"]


class ToolSerializer(serializers.ModelSerializer):
    calibration_alert = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Tool
        fields = [
            "id",
            "company",
            "name",
            "description",
            "serial_number",
            "calibration_due_date",
            "location",
            "calibration_alert",
            "status",
        ]

    def get_calibration_alert(self, obj):
        return obj.calibration_alert

    def get_status(self, obj):
        return obj.status
      

      
      
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


class WorkOrderHistoryListSerializer(serializers.ModelSerializer):
    """Slim row for service history search results."""

    aircraft = serializers.SerializerMethodField()
    signed_by_name = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    parts_summary = serializers.SerializerMethodField()
    last_edited_by = serializers.SerializerMethodField()
    last_edited_at = serializers.SerializerMethodField()

    class Meta:
        model = WorkOrder
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "aircraft",
            "ATA_code",
            "components_affected",
            "created_at",
            "updated_at",
            "due_by",
            "signature_date",
            "signed_by_name",
            "assignee_name",
            "created_by_name",
            "parts_summary",
            "last_edited_by",
            "last_edited_at",
        ]

    def get_aircraft(self, obj):
        ac = obj.aircraft
        if not ac:
            return None
        return {
            "id": ac.id,
            "registration_number": ac.registration_number or "",
            "model": ac.model or "",
        }

    def _profile_name(self, profile):
        if not profile:
            return ""
        fn = (profile.first_name or "").strip()
        ln = (profile.last_name or "").strip()
        return f"{fn} {ln}".strip() or (profile.username or "")

    def get_signed_by_name(self, obj):
        return self._profile_name(obj.signed_by)

    def get_assignee_name(self, obj):
        return self._profile_name(getattr(obj, "assignee", None)) or self._profile_name(
            getattr(obj, "created_by", None)
        )

    def get_created_by_name(self, obj):
        return self._profile_name(getattr(obj, "created_by", None))

    def get_parts_summary(self, obj):
        parts = serialize_work_order_parts(obj)
        if not parts:
            return ""
        return ", ".join(
            f"{p['part_number']} — {p['name']} (×{p['quantity']})" for p in parts
        )

    def get_last_edited_by(self, obj):
        act = obj.activities.first()
        if not act:
            return ""
        a = act.actor
        if not a:
            return "System"
        return self._profile_name(a)

    def get_last_edited_at(self, obj):
        act = obj.activities.first()
        return act.created_at if act else None


def company_catalog_parts_qs(company):
    """Parts in the company catalog (on an aircraft or in inventory)."""
    if company is None:
        return Part.objects.none()
    return Part.objects.filter(
        Q(aircraft__company=company) | Q(inventories__company=company)
    ).distinct()


class InstalledComponentListSerializer(serializers.ModelSerializer):
    aircraft_label = serializers.SerializerMethodField()
    remaining_value = serializers.SerializerMethodField()
    calendar_days_remaining = serializers.SerializerMethodField()
    calendar_used_pct = serializers.SerializerMethodField()
    event_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = InstalledComponent
        fields = [
            "id",
            "part",
            "part_number",
            "part_name",
            "serial_number",
            "component_type",
            "aircraft",
            "aircraft_label",
            "location",
            "limit_type",
            "limit_value",
            "used_value",
            "remaining_value",
            "limit_due_date",
            "calendar_days_remaining",
            "calendar_used_pct",
            "installed_at",
            "event_count",
        ]

    def get_aircraft_label(self, obj):
        ac = obj.aircraft
        if not ac:
            return ""
        reg = ac.registration_number or ""
        model = (ac.model or "").strip()
        return f"{reg} {model}".strip() if model else reg

    def get_remaining_value(self, obj):
        rem = obj.remaining_value
        return rem

    def get_calendar_days_remaining(self, obj):
        return obj.calendar_days_remaining

    def get_calendar_used_pct(self, obj):
        return obj.calendar_used_pct


class ComponentHistoryActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = ComponentHistoryActivity
        fields = [
            "id",
            "created_at",
            "event_type",
            "summary",
            "actor_name",
            "component_event",
        ]

    def _profile_name(self, profile):
        if not profile:
            return ""
        fn = (profile.first_name or "").strip()
        ln = (profile.last_name or "").strip()
        return f"{fn} {ln}".strip() or (profile.username or "")

    def get_actor_name(self, obj):
        return self._profile_name(obj.actor)


class ComponentEventSerializer(serializers.ModelSerializer):
    aircraft_label = serializers.SerializerMethodField()
    work_order_label = serializers.SerializerMethodField()
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = ComponentEvent
        fields = [
            "id",
            "event_type",
            "occurred_at",
            "summary",
            "metadata",
            "aircraft",
            "aircraft_label",
            "work_order",
            "work_order_label",
            "actor_name",
        ]

    def _profile_name(self, profile):
        if not profile:
            return ""
        fn = (profile.first_name or "").strip()
        ln = (profile.last_name or "").strip()
        return f"{fn} {ln}".strip() or (profile.username or "")

    def get_aircraft_label(self, obj):
        ac = obj.aircraft
        if not ac:
            return ""
        return ac.registration_number or ""

    def get_work_order_label(self, obj):
        wo = obj.work_order
        if not wo:
            return ""
        return wo.title or f"Work order #{wo.id}"

    def get_actor_name(self, obj):
        return self._profile_name(obj.actor)


class InstalledComponentDetailSerializer(InstalledComponentListSerializer):
    notes = serializers.CharField()

    class Meta(InstalledComponentListSerializer.Meta):
        fields = InstalledComponentListSerializer.Meta.fields + ["notes"]


class InstalledComponentCreateSerializer(serializers.ModelSerializer):
    """Register a tracked component (rotable or consumable) for lifecycle history."""

    part_id = serializers.PrimaryKeyRelatedField(
        queryset=Part.objects.none(),
        required=True,
        source="part",
    )
    initial_event_summary = serializers.CharField(
        required=False, allow_blank=True, max_length=500
    )

    class Meta:
        model = InstalledComponent
        fields = [
            "part_number",
            "part_name",
            "serial_number",
            "component_type",
            "aircraft",
            "location",
            "limit_type",
            "limit_value",
            "used_value",
            "limit_due_date",
            "installed_at",
            "notes",
            "part_id",
            "initial_event_summary",
        ]
        read_only_fields = ["part_number", "part_name"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        company = self.context.get("company")
        if company is not None:
            self.fields["part_id"].queryset = company_catalog_parts_qs(company)
            self.fields["aircraft"].queryset = Aircraft.objects.filter(company=company)

    def validate(self, data):
        company = self.context.get("company")
        if company is None:
            raise serializers.ValidationError(
                "Company context is required to register a component."
            )

        part = data.get("part")
        if not part:
            raise serializers.ValidationError(
                {"part_id": "Select a part from your Parts inventory catalog."}
            )

        if not company_catalog_parts_qs(company).filter(pk=part.pk).exists():
            raise serializers.ValidationError(
                {"part_id": "This part is not in your company's parts catalog."}
            )

        data["part_number"] = part.part_number.strip()
        data["part_name"] = (part.name or "").strip()

        sn = (data.get("serial_number") or "").strip()
        data["serial_number"] = sn
        ctype = data.get("component_type") or InstalledComponent.ComponentType.SERIALIZED
        if sn:
            data["component_type"] = InstalledComponent.ComponentType.SERIALIZED
        elif ctype == InstalledComponent.ComponentType.SERIALIZED:
            raise serializers.ValidationError(
                {"serial_number": "Enter a serial number for serialized (rotable) parts."}
            )
        else:
            data["component_type"] = InstalledComponent.ComponentType.CONSUMABLE

        aircraft = data.get("aircraft")
        if aircraft and aircraft.company_id != company.id:
            raise serializers.ValidationError(
                {"aircraft": "Aircraft must belong to your company."}
            )
        if not aircraft and part.aircraft_id:
            data["aircraft"] = part.aircraft

        return data


class InstalledComponentUpdateSerializer(serializers.ModelSerializer):
    """Supervisor corrections to a tracked component record."""

    class Meta:
        model = InstalledComponent
        fields = [
            "location",
            "aircraft",
            "limit_type",
            "limit_value",
            "used_value",
            "limit_due_date",
            "notes",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        company = self.context.get("company")
        if company is not None:
            self.fields["aircraft"].queryset = Aircraft.objects.filter(company=company)

    def validate(self, data):
        company = self.context.get("company")
        aircraft = data.get("aircraft")
        if aircraft and company and aircraft.company_id != company.id:
            raise serializers.ValidationError(
                {"aircraft": "Aircraft must belong to your company."}
            )
        limit_type = data.get("limit_type", getattr(self.instance, "limit_type", ""))
        if limit_type == InstalledComponent.LimitType.CALENDAR:
            due = data.get("limit_due_date", getattr(self.instance, "limit_due_date", None))
            if due is None and "limit_due_date" in data:
                raise serializers.ValidationError(
                    {"limit_due_date": "Due date is required for calendar life limits."}
                )
        return data


class ComponentEventUpdateSerializer(serializers.ModelSerializer):
    """Supervisor corrections to a timeline entry."""

    class Meta:
        model = ComponentEvent
        fields = ["event_type", "occurred_at", "summary", "aircraft", "work_order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        company = self.context.get("company")
        if company is not None:
            self.fields["aircraft"].queryset = Aircraft.objects.filter(company=company)
            self.fields["work_order"].queryset = WorkOrder.objects.filter(company=company)

