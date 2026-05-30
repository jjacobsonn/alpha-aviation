"""
Idempotent demo tenant: Cascade Air Services (smaller second company for platform admin).

Creates company, all tenant roles, 2 aircraft, flights, parts/inventory, work orders
(with parts + closed rows for service history), discrepancies, maintenance intervals,
component history, calibrated tools, and labor entries.

Usage:
  python manage.py bootstrap_cascade_demo
  python manage.py bootstrap_cascade_demo --company-id 2

Platform admin: pick "Cascade Air Services" in Site Admin (sets X-Company-Id) or:
  localStorage.setItem('adminCompanyId', '<company_id>')
"""

import json
from datetime import date, timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

from api.models import (
    Aircraft,
    AircraftMaintenanceInterval,
    Company,
    ComponentEvent,
    Discrepancy,
    Flight,
    InstalledComponent,
    Inventory,
    InventoryPart,
    LaborEntry,
    Mechanic,
    Part,
    Pilot,
    Profile,
    WorkOrder,
    WorkOrderPart,
)

COMPANY_NAME = "Cascade Air Services"
DEFAULT_PASSWORD = "Demo2026!"

OWNER = ("ellen.cascade", "Ellen", "Brooks", "ellen.cascade@cascadeair.demo", 5101)
PILOTS = [
    ("nina.cascade", "Nina", "Walsh", "nina.cascade@cascadeair.demo", "commercial"),
    ("owen.cascade", "Owen", "Pike", "owen.cascade@cascadeair.demo", "private"),
]
DISPATCHERS = [
    ("dana.cascade", "Dana", "Cho", "dana.cascade@cascadeair.demo"),
]
MECHANICS = [
    ("rex.cascade", "Rex", "Holt", "rex.cascade@cascadeair.demo", 881204),
    ("tina.cascade", "Tina", "Marsh", "tina.cascade@cascadeair.demo", 881205),
]

AIRCRAFT = [
    {
        "registration_number": "N55CAS",
        "model": "172S Skyhawk SP",
        "manufacturer": "Cessna",
        "engine_type": "Lycoming IO-360-L2A",
        "year_built": 2018,
        "location": "KPDX",
        "tach_current": "2148.6",
        "hobbs_current": "2152.1",
        "aircraft_type": "Single-engine piston",
        "fleet_status": "active",
        "specs": {"Avionics": "Garmin G1000", "Useful load": "910 lb"},
    },
    {
        "registration_number": "N88CAS",
        "model": "SR22T",
        "manufacturer": "Cirrus",
        "engine_type": "Continental IO-550-N",
        "year_built": 2021,
        "location": "KPDX",
        "tach_current": "612.4",
        "hobbs_current": "618.0",
        "aircraft_type": "Single-engine piston",
        "fleet_status": "maintenance_due",
        "specs": {"CAPS": "Installed", "Avionics": "Perspective+" },
    },
]

PARTS_CATALOG = {
    "MS20470AD4-4": ("Rivet, universal", "3/32 in rivet", 120, 30, "Crib 1"),
    "AN960-416": ("Washer, flat", "1/4 in washer", 60, 15, "Crib 1"),
    "CH48110-1": ("Oil filter", "IO-360 filter", 3, 2, "Shelf A"),
    "06-5046-1": ("Brake lining", "Main wheel brakes", 2, 1, "LG bay"),
    "LW-15738": ("Spark plug", "REM38E", 4, 2, "Engine shelf"),
    "33-401-1": ("Nav light lens", "Wingtip lens", 1, 1, "Avionics"),
    "SR22-ELT": ("ELT battery", "406 MHz cell", 1, 1, "Avionics"),
    "10-349071": ("Fuel strainer", "Gascolator screen", 2, 1, "Shelf B"),
}

UNIVERSAL_PART_NUMBERS = ["MS20470AD4-4", "AN960-416", "CH48110-1", "10-349071"]
TAIL_PART_NUMBERS = {
    "N55CAS": ["06-5046-1", "LW-15738", "33-401-1"],
    "N88CAS": ["SR22-ELT", "33-401-1", "LW-15738", "06-5046-1"],
}

WORK_ORDER_SPECS = [
    (
        "Annual inspection",
        "N55CAS",
        "rex.cascade",
        "open",
        "medium",
        32,
        "2148.6",
    ),
    (
        "50-hour oil change",
        "N55CAS",
        "tina.cascade",
        "closed",
        "low",
        79,
        "2140.0",
    ),
    (
        "Autopilot rigging check",
        "N88CAS",
        "rex.cascade",
        "in_progress",
        "high",
        22,
        "612.4",
    ),
    (
        "Landing light replacement",
        "N88CAS",
        "tina.cascade",
        "closed",
        "medium",
        33,
        "611.8",
    ),
]

WORK_ORDER_PART_ASSIGNMENTS = {
    "Annual inspection": ["CH48110-1", "LW-15738", "AN960-416"],
    "50-hour oil change": ["CH48110-1", "10-349071"],
    "Autopilot rigging check": ["SR22-ELT", "33-401-1"],
    "Landing light replacement": ["33-401-1", "MS20470AD4-4"],
}

DISCREPANCY_SPECS = [
    (
        "N55CAS",
        "nina.cascade",
        "Left mag rough above 1700 RPM on run-up.",
        "74-00",
        "2148.0",
        "pending",
        "Annual inspection",
    ),
    (
        "N88CAS",
        "owen.cascade",
        "PFD airspeed disagree >4 kt in slow flight.",
        "34-11",
        "612.0",
        "pending",
        None,
    ),
    (
        "N88CAS",
        "rex.cascade",
        "Landing light found inop during preflight.",
        "33-40",
        "611.8",
        "closed",
        "Landing light replacement",
    ),
]

FLIGHT_SPECS = [
    ("CAS101", "N55CAS", "KPDX", "KUAO", 2, 0, "training", "private", "approved"),
    ("CAS102", "N55CAS", "KUAO", "KPDX", 3, 0, "training", "private", "approved"),
    ("CAS103", "N88CAS", "KPDX", "KPDX", 4, 1, "training", "commercial", "approved"),
    ("CAS104", "N88CAS", "KPDX", "KONP", 5, 1, "charter", "commercial", "scheduled"),
    ("CAS105", "N55CAS", "KPDX", "KTTD", 7, 0, "charter", "commercial", "pending approval"),
    ("CAS106", "N88CAS", "KONP", "KPDX", 8, 1, "charter", "commercial", "approved"),
]

INTERVALS_BY_REG = {
    "N55CAS": [
        {
            "name": "100-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 100,
            "last_done_tach": 2055.0,
            "submitted_by": "Rex Holt",
            "notes": "Due before charter season peak.",
        },
        {
            "name": "Annual inspection",
            "interval_type": "days",
            "due_every_days": 365,
            "days_ago": 340,
            "submitted_by": "Tina Marsh",
            "notes": "Open annual WO on file.",
        },
    ],
    "N88CAS": [
        {
            "name": "100-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 100,
            "last_done_tach": 540.0,
            "submitted_by": "Rex Holt",
            "notes": "Autopilot rigging in progress.",
        },
        {
            "name": "CAPS repack",
            "interval_type": "days",
            "due_every_days": 3650,
            "days_ago": 800,
            "submitted_by": "Tina Marsh",
            "notes": "Within calendar limit.",
        },
    ],
}

COMPONENT_SPECS = [
    {
        "aircraft_reg": "N55CAS",
        "work_order_title": "50-hour oil change",
        "part_number": "CH48110-1",
        "part_name": "Oil filter element",
        "serial_number": "",
        "component_type": InstalledComponent.ComponentType.CONSUMABLE,
        "location": "Parts room — Shelf A",
        "limit_type": "",
        "events": [
            ("install", 45, "Issued for 50-hour oil change."),
            ("work_order", 30, "Documented on closed oil change WO."),
        ],
    },
    {
        "aircraft_reg": "N55CAS",
        "part_number": "65-60012-3",
        "part_name": "Vacuum pump",
        "serial_number": "VP-CAS-5512",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Engine accessory case",
        "limit_type": InstalledComponent.LimitType.HOURS,
        "limit_value": Decimal("1000"),
        "used_value": Decimal("812"),
        "installed_days_ago": 300,
        "events": [
            ("install", 300, "Replaced during annual."),
            ("inspection", 60, "Output within limits."),
        ],
    },
    {
        "aircraft_reg": "N88CAS",
        "work_order_title": "Landing light replacement",
        "part_number": "33-401-1",
        "part_name": "Landing light assembly",
        "serial_number": "LL-CAS-8801",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Left wing leading edge",
        "limit_type": InstalledComponent.LimitType.CALENDAR,
        "limit_due_days_ahead": 365,
        "installed_days_ago": 14,
        "events": [
            ("removal", 16, "Removed inop lamp assembly."),
            ("install", 14, "New LED assembly installed."),
            ("work_order", 12, "Closed landing light WO."),
        ],
    },
    {
        "aircraft_reg": "N88CAS",
        "work_order_title": "Autopilot rigging check",
        "part_number": "SR22-ELT",
        "part_name": "ELT battery pack",
        "serial_number": "ELT-CAS-2204",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Aft equipment bay",
        "limit_type": InstalledComponent.LimitType.CALENDAR,
        "limit_due_days_ahead": 180,
        "installed_days_ago": 200,
        "events": [
            ("inspection", 20, "G-switch test OK."),
            ("note", 5, "Do not disturb during autopilot rigging."),
        ],
    },
    {
        "aircraft_reg": "N88CAS",
        "part_number": "06-5046-1",
        "part_name": "Brake lining set",
        "serial_number": "BL-CAS-9901",
        "component_type": InstalledComponent.ComponentType.SERIALIZED,
        "location": "Shop — staged",
        "limit_type": InstalledComponent.LimitType.CYCLES,
        "limit_value": Decimal("300"),
        "used_value": Decimal("120"),
        "installed_days_ago": None,
        "events": [
            ("note", 7, "Reserved for next wheel inspection."),
        ],
    },
]


class Command(BaseCommand):
    help = "Seed Cascade Air Services — compact second demo company for platform admin."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Existing company PK (default: create or find by name).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        company = self._resolve_company(options["company_id"])
        if company is None:
            return

        users = {}
        users["ellen.cascade"] = self._ensure_owner(company)
        users.update(self._ensure_pilots(company))
        users.update(self._ensure_dispatchers(company))
        users.update(self._ensure_mechanics(company))

        aircraft = self._ensure_aircraft(company)
        inv = Inventory.objects.filter(company=company).first()
        if inv is None:
            inv = Inventory.objects.create(company=company)

        parts_by_reg = self._ensure_parts(aircraft, inv)
        work_orders = self._ensure_work_orders(company, aircraft, users, parts_by_reg)
        disc_count = self._ensure_discrepancies(aircraft, users, work_orders)
        flight_count = self._ensure_flights(company, aircraft, users)
        interval_count = self._ensure_maintenance_intervals(aircraft)
        comp_count, ev_count = self._ensure_components(company, aircraft, users, work_orders)
        labor_count = self._ensure_labor_for_closed(work_orders, users)

        call_command(
            "bootstrap_parts_and_tools",
            company_id=company.id,
            verbosity=0,
        )

        wo_part_count = WorkOrderPart.objects.filter(
            work_order__aircraft__company=company
        ).count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Cascade demo ready — {company.name} (id={company.id})\n"
                f"  Users: {Profile.objects.filter(company=company).count()} "
                f"(owner, {len(PILOTS)} pilots, dispatcher, {len(MECHANICS)} mechanics)\n"
                f"  Aircraft: {len(aircraft)} | Flights: {flight_count} new this run\n"
                f"  Parts: {Part.objects.filter(aircraft__company=company).count()} | "
                f"WO part lines: {wo_part_count}\n"
                f"  Work orders: {WorkOrder.objects.filter(aircraft__company=company).count()} "
                f"({WorkOrder.objects.filter(aircraft__company=company, status='closed').count()} closed for service history)\n"
                f"  Discrepancies: {Discrepancy.objects.filter(aircraft__company=company).count()} "
                f"({disc_count} new)\n"
                f"  Intervals: {interval_count} new | Components: {comp_count} ({ev_count} events new)\n"
                f"  Labor entries added: {labor_count}\n"
                f"  Password for all tenant users: {DEFAULT_PASSWORD!r}\n"
                f"  Platform admin: log in as demo, select company in Site Admin, or "
                f"localStorage adminCompanyId={company.id}"
            )
        )

    def _resolve_company(self, company_id):
        if company_id is not None:
            company = Company.objects.filter(pk=company_id).first()
            if company:
                return company
            self.stdout.write(self.style.ERROR(f"Company id={company_id} not found."))
            return None
        company, created = Company.objects.get_or_create(
            name=COMPANY_NAME,
            defaults={"locations": "KPDX — Cascade Air Services"},
        )
        if created:
            self.stdout.write(f"Created company {COMPANY_NAME!r} (id={company.id}).")
        return company

    def _ensure_owner(self, company):
        username, first, last, email, emp = OWNER
        user, created = Profile.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first,
                "last_name": last,
                "email": email,
                "company": company,
                "company_role": "owner",
                "employee_id": emp,
            },
        )
        if user.company_id != company.id:
            user.company = company
            user.company_role = "owner"
            user.save(update_fields=["company", "company_role"])
        if created:
            user.set_password(DEFAULT_PASSWORD)
            user.save()
        return user

    def _ensure_pilots(self, company):
        users = {}
        medical = date.today() + timedelta(days=200)
        for idx, (username, first, last, email, cert) in enumerate(PILOTS, start=1):
            user, created = Profile.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "email": email,
                    "company": company,
                    "company_role": "pilot",
                    "employee_id": 5200 + idx,
                },
            )
            if user.company_id != company.id:
                user.company = company
                user.company_role = "pilot"
                user.save(update_fields=["company", "company_role"])
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
            Pilot.objects.update_or_create(
                profile=user,
                defaults={
                    "medically_cleared_until": medical,
                    "pilot_certificate": cert,
                },
            )
            users[username] = user
        return users

    def _ensure_dispatchers(self, company):
        users = {}
        for idx, (username, first, last, email) in enumerate(DISPATCHERS, start=1):
            user, created = Profile.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "email": email,
                    "company": company,
                    "company_role": "dispatcher",
                    "employee_id": 5300 + idx,
                },
            )
            if user.company_id != company.id:
                user.company = company
                user.company_role = "dispatcher"
                user.save(update_fields=["company", "company_role"])
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
            users[username] = user
        return users

    def _ensure_mechanics(self, company):
        users = {}
        for idx, (username, first, last, email, ap_num) in enumerate(MECHANICS, start=1):
            user, created = Profile.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "email": email,
                    "company": company,
                    "company_role": "mechanic",
                    "employee_id": 5400 + idx,
                },
            )
            if user.company_id != company.id:
                user.company = company
                user.company_role = "mechanic"
                user.save(update_fields=["company", "company_role"])
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
            Mechanic.objects.update_or_create(
                profile=user,
                defaults={
                    "AP_certificate_number": ap_num,
                    "inspector_authentication": idx == 1,
                },
            )
            users[username] = user
        return users

    def _ensure_aircraft(self, company):
        by_reg = {}
        for spec in AIRCRAFT:
            reg = spec["registration_number"]
            ac = Aircraft.objects.filter(registration_number=reg).first()
            if ac:
                for key, value in spec.items():
                    setattr(ac, key, value)
                ac.company = company
                ac.save()
            else:
                ac = self._insert_aircraft(company, spec)
            by_reg[reg] = ac
        return by_reg

    def _insert_aircraft(self, company, spec):
        if not self._has_db_column("api_aircraft", "created_at"):
            return Aircraft.objects.create(**spec, company=company)

        hobbs_val = spec.get("hobbs_current") or spec.get("tach_current") or 0
        specs_json = json.dumps(spec.get("specs") or {})
        now = timezone.now()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO api_aircraft (
                    registration_number, model, manufacturer, engine_type, year_built,
                    company_id, aircraft_type, fleet_status, location, specs,
                    tach_current, hobbs_current, hobbs_time, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s)
                RETURNING id
                """,
                [
                    spec["registration_number"],
                    spec["model"],
                    spec["manufacturer"],
                    spec.get("engine_type"),
                    spec["year_built"],
                    company.id,
                    spec.get("aircraft_type", ""),
                    spec.get("fleet_status", "active"),
                    spec.get("location", ""),
                    specs_json,
                    spec.get("tach_current"),
                    hobbs_val,
                    hobbs_val,
                    now,
                ],
            )
            pk = cursor.fetchone()[0]
        return Aircraft.objects.get(pk=pk)

    @staticmethod
    def _has_db_column(table, column):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
                """,
                [table, column],
            )
            return cursor.fetchone() is not None

    def _part_numbers_for_reg(self, reg):
        seen = set()
        ordered = []
        for pn in UNIVERSAL_PART_NUMBERS + TAIL_PART_NUMBERS.get(reg, []):
            if pn in PARTS_CATALOG and pn not in seen:
                seen.add(pn)
                ordered.append(pn)
        return ordered

    def _ensure_parts(self, aircraft_by_reg, inventory):
        parts_by_reg = {}
        for reg, ac in aircraft_by_reg.items():
            parts_by_reg[reg] = {}
            for pn in self._part_numbers_for_reg(reg):
                name, desc, qty, alert, loc = PARTS_CATALOG[pn]
                part, _ = Part.objects.update_or_create(
                    part_number=pn,
                    aircraft=ac,
                    defaults={"name": name, "description": desc},
                )
                parts_by_reg[reg][pn] = part
                InventoryPart.objects.update_or_create(
                    inventory=inventory,
                    part=part,
                    defaults={
                        "quantity": qty,
                        "stock_alert": alert,
                        "shop_location": loc,
                    },
                )
        return parts_by_reg

    def _ensure_work_orders(self, company, aircraft_by_reg, users, parts_by_reg):
        owner = users["ellen.cascade"]
        work_orders = {}
        today = date.today()
        for (
            title,
            reg,
            assignee_key,
            status,
            priority,
            ata,
            tach,
        ) in WORK_ORDER_SPECS:
            ac = aircraft_by_reg.get(reg)
            assignee = users.get(assignee_key)
            if not ac or not assignee:
                continue
            closed = status == "closed"
            wo, _ = WorkOrder.objects.update_or_create(
                aircraft=ac,
                title=title,
                defaults={
                    "created_by": owner,
                    "assignee": assignee,
                    "description": f"Cascade maintenance — {title}.",
                    "status": status,
                    "priority": priority,
                    "ATA_code": ata,
                    "tach_time": tach,
                    "due_by": today + timedelta(days=7 if closed else 14),
                    "components_affected": title.split()[0],
                    "signature_date": today - timedelta(days=12) if closed else None,
                    "signed_by": assignee if closed else None,
                    "completion_notes": (
                        "Signed off per maintenance manual." if closed else ""
                    ),
                },
            )
            if closed:
                wo.updated_at = timezone.now() - timedelta(days=10)
                wo.save(update_fields=["updated_at"])
            work_orders[title] = wo
            for pn in WORK_ORDER_PART_ASSIGNMENTS.get(title, []):
                part = parts_by_reg.get(reg, {}).get(pn)
                if part:
                    WorkOrderPart.objects.get_or_create(
                        work_order=wo,
                        part=part,
                        defaults={"quantity": 1},
                    )
        return work_orders

    def _ensure_discrepancies(self, aircraft_by_reg, users, work_orders):
        new_count = 0
        for reg, reporter_key, desc, ata, tach, status, wo_title in DISCREPANCY_SPECS:
            ac = aircraft_by_reg.get(reg)
            reporter = users.get(reporter_key)
            if not ac or not reporter:
                continue
            wo = work_orders.get(wo_title) if wo_title else None
            _, created = Discrepancy.objects.get_or_create(
                aircraft=ac,
                reporter=reporter,
                description=desc[:200],
                defaults={
                    "ata_code": ata,
                    "tach_time": tach,
                    "status": status,
                    "work_order": wo,
                },
            )
            if created:
                new_count += 1
        return new_count

    def _ensure_flights(self, company, aircraft_by_reg, users):
        pilots = [users[u[0]] for u in PILOTS if u[0] in users]
        dispatchers = [users[u[0]] for u in DISPATCHERS if u[0] in users]
        if not pilots:
            return 0
        base = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
        new_count = 0
        for spec in FLIGHT_SPECS:
            (
                flight_number,
                reg,
                origin,
                destination,
                day_offset,
                pilot_idx,
                flight_type,
                pilot_req,
                status,
            ) = spec
            ac = aircraft_by_reg.get(reg)
            if not ac:
                continue
            if Flight.objects.filter(company=company, flight_number=flight_number).exists():
                continue
            primary = pilots[pilot_idx % len(pilots)]
            secondary = pilots[(pilot_idx + 1) % len(pilots)]
            dispatcher = dispatchers[0] if dispatchers else None
            dep = base + timedelta(days=day_offset)
            arr = dep + timedelta(hours=1, minutes=45)
            if origin == destination:
                arr = dep + timedelta(hours=1, minutes=30)
            Flight.objects.create(
                company=company,
                aircraft=ac,
                flight_number=flight_number,
                origin=origin,
                destination=destination,
                departure_time=dep,
                arrival_time=arr,
                route=f"{origin}-{destination}" if origin != destination else "Local",
                flight_type=flight_type,
                primary_pilot=primary,
                secondary_pilot=secondary if secondary.id != primary.id else None,
                pilot_requirement=pilot_req,
                dispatcher=dispatcher,
                status=status,
            )
            new_count += 1
        return new_count

    def _ensure_maintenance_intervals(self, aircraft_by_reg):
        today = timezone.localdate()
        created = 0
        for reg, rows in INTERVALS_BY_REG.items():
            ac = aircraft_by_reg.get(reg)
            if not ac:
                continue
            for row in rows:
                last_done_date = None
                if row.get("days_ago") is not None:
                    last_done_date = today - timedelta(days=row["days_ago"])
                notes = row.get("notes", "")
                submitted = row.get("submitted_by")
                if submitted:
                    notes = f"[Submitted By: {submitted}]\n{notes}"
                _, was_new = AircraftMaintenanceInterval.objects.update_or_create(
                    aircraft=ac,
                    name=row["name"],
                    defaults={
                        "interval_type": row["interval_type"],
                        "due_every_hours": row.get("due_every_hours"),
                        "due_every_days": row.get("due_every_days"),
                        "last_done_tach": row.get("last_done_tach"),
                        "last_done_date": last_done_date,
                        "notes": notes,
                        "is_active": True,
                    },
                )
                if was_new:
                    created += 1
        return created

    def _ensure_components(self, company, aircraft_by_reg, users, work_orders):
        now = timezone.now()
        today = timezone.localdate()
        actor = users.get("rex.cascade") or users.get("ellen.cascade")
        components_created = 0
        events_created = 0

        for spec in COMPONENT_SPECS:
            reg = spec.get("aircraft_reg")
            aircraft = aircraft_by_reg.get(reg) if reg else None
            wo = None
            wo_title = spec.get("work_order_title")
            if wo_title and aircraft:
                wo = work_orders.get(wo_title)
            part = None
            if aircraft:
                part = Part.objects.filter(
                    part_number=spec["part_number"], aircraft=aircraft
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
                serial_number=spec.get("serial_number", ""),
                defaults={
                    "part": part,
                    "part_name": spec["part_name"],
                    "component_type": spec["component_type"],
                    "aircraft": aircraft
                    if spec["component_type"]
                    == InstalledComponent.ComponentType.SERIALIZED
                    and (spec.get("installed_days_ago") is not None or reg)
                    else None,
                    "location": spec.get("location", ""),
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

        return components_created, events_created

    def _ensure_labor_for_closed(self, work_orders, users):
        created = 0
        default_mech = users.get("rex.cascade")
        for wo in work_orders.values():
            if wo.status != "closed":
                continue
            if wo.labor_entries.exists():
                continue
            mechanic = wo.assignee or default_mech
            LaborEntry.objects.create(
                work_order=wo,
                mechanic=mechanic,
                hours=Decimal("2.5"),
                work_date=wo.signature_date or timezone.localdate(),
                notes="Cascade demo — documented labor",
                created_by=mechanic,
            )
            created += 1
        return created
