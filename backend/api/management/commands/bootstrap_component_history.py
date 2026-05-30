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
        "aircraft_reg": "N172HF",
        "work_order_title": "100-hour inspection due",
        "part_number": "65-60012-3",
        "part_name": "Hydraulic pump assembly",
        "serial_number": "HP-88421",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Aircraft — main gear bay",
        "limit_type": InstalledComponent.LimitType.HOURS,
        "limit_value": Decimal("2000"),
        "used_value": Decimal("1247"),
        "installed_days_ago": 420,
        "notes": "Rotable; tracked on N172HF.",
        "events": [
            ("install", 420, "Installed during C-check."),
            ("inspection", 180, "Borescope inspection — no defects."),
            ("work_order", 45, "Serviced during 100-hour work order."),
            ("note", 10, "Verified pressure test within limits."),
        ],
    },
    {
        "aircraft_reg": "N46HF",
        "work_order_title": "M350 brake and tire inspection",
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
        "aircraft_reg": "N172HF",
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
        "aircraft_reg": "N46HF",
        "work_order_title": "M350 brake and tire inspection",
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
        "notes": "Calendar life limit — staged for M350 brake WO.",
        "events": [
            ("note", 5, "Received from vendor; shelf life verified."),
            ("work_order", 3, "Reserved on brake and tire inspection WO."),
        ],
    },
    {
        "aircraft_reg": "N350HF",
        "work_order_title": "King Air 300-hour inspection",
        "part_number": "KA350-BRAKE",
        "part_name": "King Air main wheel disc",
        "serial_number": "KD-350-4412",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Aircraft — left main",
        "limit_type": InstalledComponent.LimitType.CYCLES,
        "limit_value": Decimal("800"),
        "used_value": Decimal("612"),
        "installed_days_ago": 240,
        "notes": "Cycle-limited disc on King Air 350.",
        "events": [
            ("install", 240, "Installed after wheel shop visit."),
            ("inspection", 60, "Dimensional check within limits."),
            ("work_order", 14, "Inspected during 300-hour phase."),
        ],
    },
    {
        "aircraft_reg": "N915HF",
        "work_order_title": "Caravan prop deice boot",
        "part_number": "C208-FUEL-01",
        "part_name": "PT6 fuel nozzle gasket set",
        "serial_number": "FN-208-9021",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Engine — fuel nozzle bay",
        "limit_type": InstalledComponent.LimitType.HOURS,
        "limit_value": Decimal("500"),
        "used_value": Decimal("388"),
        "installed_days_ago": 180,
        "notes": "AD-tracked fuel nozzle assembly.",
        "events": [
            ("install", 180, "Complied with recurring fuel nozzle AD."),
            ("inspection", 30, "Leak check — no findings."),
            ("work_order", 7, "Reviewed during prop deice boot WO."),
        ],
    },
    {
        "aircraft_reg": "N28HF",
        "work_order_title": "SR22 autopilot rigging check",
        "part_number": "SR22-ELT",
        "part_name": "406 MHz ELT battery",
        "serial_number": "ELT-SR22-1188",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Aft equipment bay",
        "limit_type": InstalledComponent.LimitType.CALENDAR,
        "limit_value": None,
        "used_value": None,
        "limit_due_days_ahead": 200,
        "installed_days_ago": 400,
        "notes": "Calendar replacement due on SR22.",
        "events": [
            ("install", 400, "Battery replaced at annual."),
            ("inspection", 90, "G-switch test satisfactory."),
            ("note", 20, "Autopilot rigging WO — verify ELT not disturbed."),
        ],
    },
    {
        "aircraft_reg": "N821HF",
        "work_order_title": "Baron alternator troubleshooting",
        "part_number": "P/N 800063",
        "part_name": "Alternator drive belt",
        "serial_number": "ALT-BLT-5520",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Engine — accessory section",
        "limit_type": InstalledComponent.LimitType.HOURS,
        "limit_value": Decimal("600"),
        "used_value": Decimal("521"),
        "installed_days_ago": 120,
        "notes": "Replaced during alternator squawk investigation.",
        "events": [
            ("removal", 125, "Removed worn belt — glazing noted."),
            ("install", 120, "New belt installed and tensioned."),
            ("work_order", 8, "Troubleshooting WO — load test passed."),
        ],
    },
    {
        "aircraft_reg": "N350HF",
        "work_order_title": "King Air 300-hour inspection",
        "part_number": "65-60012-3",
        "part_name": "Landing gear actuator",
        "serial_number": "LG-350-7781",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Main gear bay — right",
        "limit_type": InstalledComponent.LimitType.HOURS,
        "limit_value": Decimal("3000"),
        "used_value": Decimal("1488"),
        "installed_days_ago": 500,
        "notes": "Second unit on King Air (distinct S/N from Skyhawk pump).",
        "events": [
            ("install", 500, "Overhauled unit installed."),
            ("inspection", 45, "Leak check during 300-hour."),
            ("work_order", 12, "Gear cycle test on open inspection."),
        ],
    },
    {
        "aircraft_reg": "N915HF",
        "part_number": "66-106",
        "part_name": "Main tire assembly",
        "serial_number": "TR-C208-3301",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Aircraft — right main",
        "limit_type": InstalledComponent.LimitType.CYCLES,
        "limit_value": Decimal("300"),
        "used_value": Decimal("265"),
        "installed_days_ago": 90,
        "notes": "Approaching cycle limit — plan replacement.",
        "events": [
            ("install", 90, "New tire mounted and balanced."),
            ("inspection", 14, "Tread depth within limits."),
            ("note", 2, "Flagged for replacement at next 100-hour."),
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
            aircraft_by_reg = {
                ac.registration_number: ac
                for ac in Aircraft.objects.filter(company=company)
            }
            default_aircraft = (
                Aircraft.objects.filter(company=company).order_by("id").first()
            )
            actor = (
                Profile.objects.filter(company=company, company_role="mechanic")
                .order_by("id")
                .first()
            ) or Profile.objects.filter(company=company).order_by("id").first()

            from api.serializers import company_catalog_parts_qs

            catalog = company_catalog_parts_qs(company)

            for spec in SAMPLE_COMPONENTS:
                reg = spec.get("aircraft_reg")
                aircraft = aircraft_by_reg.get(reg) if reg else default_aircraft
                wo = None
                wo_title = spec.get("work_order_title")
                if wo_title and aircraft:
                    wo = WorkOrder.objects.filter(
                        aircraft=aircraft, title=wo_title
                    ).first()
                if wo is None:
                    wo = (
                        WorkOrder.objects.filter(aircraft__company=company)
                        .order_by("-updated_at")
                        .first()
                    )

                part = None
                if aircraft:
                    part = catalog.filter(
                        part_number=spec["part_number"], aircraft=aircraft
                    ).first()
                if part is None:
                    part = catalog.filter(part_number=spec["part_number"]).first()

                installed_at = None
                if spec.get("installed_days_ago") is not None:
                    installed_at = today - timedelta(days=spec["installed_days_ago"])

                limit_due_date = None
                if spec.get("limit_due_days_ahead") is not None:
                    limit_due_date = today + timedelta(days=spec["limit_due_days_ahead"])

                serial = spec["serial_number"]
                comp, comp_new = InstalledComponent.objects.get_or_create(
                    company=company,
                    part_number=spec["part_number"],
                    serial_number=serial,
                    defaults={
                        "part": part,
                        "part_name": spec["part_name"],
                        "component_type": spec["component_type"],
                        "aircraft": aircraft
                        if spec["component_type"]
                        == InstalledComponent.ComponentType.SERIALIZED
                        and (
                            spec.get("installed_days_ago") is not None
                            or reg is not None
                        )
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
                    if event_type_key == "work_order":
                        if wo_title:
                            event_wo = wo
                        if not event_wo:
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
