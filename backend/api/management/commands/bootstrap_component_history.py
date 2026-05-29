"""
Idempotent demo data for Component History (installed components + timeline events).

Safe to run multiple times. Adds or updates sample rotables/consumables per company.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    Aircraft,
    Company,
    ComponentEvent,
    InstalledComponent,
    Part,
    Profile,
    WorkOrder,
)

SAMPLE_COMPONENTS = [
    {
        "part_number": "65-60012-3",
        "part_name": "Hydraulic pump assembly",
        "serial_number": "HP-88421",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Aircraft — main gear bay",
        "limit_type": InstalledComponent.LimitType.HOURS,
        "limit_value": Decimal("2000"),
        "used_value": Decimal("1247"),
        "installed_days_ago": 420,
        "notes": "Rotable; tracked on aircraft.",
        "events": [
            ("install", 420, "Installed during C-check."),
            ("inspection", 180, "Borescope inspection — no defects."),
            ("work_order", 45, "Serviced during open work order."),
            ("note", 10, "Verified pressure test within limits."),
        ],
    },
    {
        "part_number": "32-41008-1",
        "part_name": "Main wheel assembly",
        "serial_number": "MW-22019",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Aircraft — left main",
        "limit_type": InstalledComponent.LimitType.CYCLES,
        "limit_value": Decimal("500"),
        "used_value": Decimal("412"),
        "installed_days_ago": 300,
        "notes": "Cycle-limited rotable.",
        "events": [
            ("install", 300, "Installed after overhaul."),
            ("inspection", 90, "Tire and bearing inspection."),
            ("removal", 30, "Removed for shop visit — wheel sent to vendor."),
            ("install", 14, "Reinstalled after vendor overhaul."),
        ],
    },
    {
        "part_number": "CH48110-1",
        "part_name": "Oil filter element",
        "serial_number": "",
        "component_type": InstalledComponent.ComponentType.CONSUMABLE,
        "location": "Parts room — shelf B2",
        "limit_type": "",
        "limit_value": None,
        "used_value": None,
        "installed_days_ago": 60,
        "notes": "Consumable; no serial number.",
        "events": [
            ("install", 60, "Issued from inventory for engine change."),
            ("note", 45, "Disposed per maintenance manual."),
        ],
    },
    {
        "part_number": "06-5046-1",
        "part_name": "Brake lining set",
        "serial_number": "BL-99102",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Shop — awaiting install",
        "limit_type": InstalledComponent.LimitType.CALENDAR,
        "limit_value": None,
        "used_value": None,
        "limit_due_days_ahead": 120,
        "installed_days_ago": None,
        "notes": "Calendar life limit — in stock for next install.",
        "events": [
            ("note", 5, "Received from vendor; shelf life verified."),
        ],
    },
]


class Command(BaseCommand):
    help = "Add sample component history (installed components + events) per company."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Only seed this company (default: all companies).",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        today = timezone.localdate()
        companies = Company.objects.all().order_by("id")
        if options["company_id"] is not None:
            companies = companies.filter(pk=options["company_id"])

        if not companies.exists():
            self.stdout.write(self.style.WARNING("No companies found."))
            return

        components_created = 0
        events_created = 0

        for company in companies:
            aircraft = Aircraft.objects.filter(company=company).order_by("id").first()
            wo = (
                WorkOrder.objects.filter(aircraft__company=company)
                .order_by("-updated_at")
                .first()
            )
            actor = (
                Profile.objects.filter(company=company, company_role="mechanic")
                .order_by("id")
                .first()
            ) or Profile.objects.filter(company=company).order_by("id").first()

            from api.serializers import company_catalog_parts_qs

            catalog = company_catalog_parts_qs(company)

            for spec in SAMPLE_COMPONENTS:
                part = catalog.filter(part_number=spec["part_number"]).first()
                if not part and aircraft:
                    part = Part.objects.filter(
                        part_number=spec["part_number"],
                        aircraft=aircraft,
                    ).first()

                installed_at = None
                if spec.get("installed_days_ago") is not None:
                    installed_at = today - timedelta(days=spec["installed_days_ago"])

                limit_due_date = None
                if spec.get("limit_due_days_ahead") is not None:
                    limit_due_date = today + timedelta(days=spec["limit_due_days_ahead"])

                comp, comp_new = InstalledComponent.objects.get_or_create(
                    company=company,
                    part_number=spec["part_number"],
                    serial_number=spec["serial_number"],
                    defaults={
                        "part": part,
                        "part_name": spec["part_name"],
                        "component_type": spec["component_type"],
                        "aircraft": aircraft
                        if spec["component_type"]
                        == InstalledComponent.ComponentType.SERIALIZED
                        and spec.get("installed_days_ago")
                        else None,
                        "location": spec["location"],
                        "limit_type": spec.get("limit_type") or "",
                        "limit_value": spec.get("limit_value"),
                        "used_value": spec.get("used_value") or Decimal("0"),
                        "limit_due_date": limit_due_date,
                        "installed_at": installed_at,
                        "notes": spec.get("notes", ""),
                    },
                )
                if comp_new:
                    components_created += 1
                else:
                    comp.part = part or comp.part
                    comp.part_name = spec["part_name"]
                    comp.location = spec["location"]
                    comp.limit_type = spec.get("limit_type") or ""
                    comp.limit_value = spec.get("limit_value")
                    comp.used_value = spec.get("used_value") or comp.used_value
                    comp.limit_due_date = limit_due_date or comp.limit_due_date
                    comp.installed_at = installed_at or comp.installed_at
                    comp.notes = spec.get("notes", "")
                    comp.save()

                for event_spec in spec.get("events") or []:
                    event_type_key, days_ago, summary = event_spec
                    occurred_at = now - timedelta(days=days_ago)
                    event_aircraft = aircraft if event_type_key in (
                        "install",
                        "removal",
                        "work_order",
                    ) else None
                    event_wo = wo if event_type_key == "work_order" else None
                    if event_type_key == "work_order" and not event_wo:
                        continue

                    _, ev_new = ComponentEvent.objects.get_or_create(
                        component=comp,
                        event_type=event_type_key,
                        occurred_at=occurred_at,
                        defaults={
                            "summary": summary,
                            "aircraft": event_aircraft,
                            "work_order": event_wo,
                            "actor": actor,
                        },
                    )
                    if ev_new:
                        events_created += 1

            comp_count = InstalledComponent.objects.filter(company=company).count()
            ev_count = ComponentEvent.objects.filter(component__company=company).count()
            self.stdout.write(
                f"  {company.name} (id={company.id}): "
                f"{comp_count} component(s), {ev_count} event(s)"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. New: {components_created} component(s), {events_created} event(s)."
            )
        )
        self.stdout.write(
            "Search examples: P/N 65-60012-3, S/N HP-88421, or CH48110-1 on Component History."
        )
