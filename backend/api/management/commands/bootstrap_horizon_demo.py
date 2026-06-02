"""
Idempotent demo expansion for Horizon Flight Services.

Adds users, aircraft, flights, parts/inventory, work orders, and discrepancies
without deleting existing rows. Safe to run multiple times.

Usage:
  python manage.py bootstrap_horizon_demo
  python manage.py bootstrap_horizon_demo --company-id 1
"""

import json
from datetime import date, timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

from api.models import (
    Aircraft,
    AircraftMaintenanceInterval,
    Company,
    Discrepancy,
    Flight,
    Inventory,
    InventoryPart,
    Mechanic,
    Part,
    Pilot,
    Profile,
    WorkOrder,
    WorkOrderPart,
)

COMPANY_NAME = "Horizon Flight Services"
DEFAULT_PASSWORD = "Demo2026!"

PILOTS = [
    ("james.rivera", "James", "Rivera", "james.rivera@horizonflight.demo", "commercial"),
    ("alex.nguyen", "Alex", "Nguyen", "alex.nguyen@horizonflight.demo", "commercial"),
    ("emily.chen", "Emily", "Chen", "emily.chen@horizonflight.demo", "commercial"),
    ("david.okonkwo", "David", "Okonkwo", "david.okonkwo@horizonflight.demo", "airline"),
    ("rachel.kim", "Rachel", "Kim", "rachel.kim@horizonflight.demo", "private"),
    ("tom.brennan", "Tom", "Brennan", "tom.brennan@horizonflight.demo", "commercial"),
]

MECHANICS = [
    ("mike.torres", "Mike", "Torres", "mike.torres@horizonflight.demo", 482910),
    ("lisa.park", "Lisa", "Park", "lisa.park@horizonflight.demo", 551203),
    ("carlos.mendez", "Carlos", "Mendez", "carlos.mendez@horizonflight.demo", 603884),
]

DISPATCHERS = [
    ("sarah.mitchell", "Sarah", "Mitchell", "sarah.mitchell@horizonflight.demo"),
    ("jenny.walsh", "Jenny", "Walsh", "jenny.walsh@horizonflight.demo"),
    ("ryan.cole", "Ryan", "Cole", "ryan.cole@horizonflight.demo"),
]

AIRCRAFT = [
    {
        "registration_number": "N172HF",
        "model": "172S Skyhawk SP",
        "manufacturer": "Cessna",
        "engine_type": "Lycoming IO-360-L2A",
        "year_built": 2019,
        "location": "KBFI",
        "tach_current": "1247.3",
        "hobbs_current": "1251.8",
        "aircraft_type": "Single-engine piston",
        "fleet_status": "maintenance_due",
        "specs": {
            "Useful load": "920 lb",
            "Fuel capacity": "56 gal",
            "IFR certified": "Yes",
            "Avionics": "Garmin G1000 NXi",
        },
    },
    {
        "registration_number": "N46HF",
        "model": "PA-46-350P M350",
        "manufacturer": "Piper",
        "engine_type": "Lycoming TIO-540-AE2A",
        "year_built": 2017,
        "location": "KPAE",
        "tach_current": "892.6",
        "hobbs_current": "896.2",
        "aircraft_type": "Single-engine turboprop",
        "fleet_status": "active",
        "specs": {
            "Pressurization": "6.5 psi",
            "Max cruise": "260 KTAS",
            "Avionics": "Garmin G1000 NXi",
        },
    },
    {
        "registration_number": "N350HF",
        "model": "King Air 350",
        "manufacturer": "Beechcraft",
        "engine_type": "PT6A-60A",
        "year_built": 2020,
        "location": "KPAE",
        "tach_current": "1564.2",
        "hobbs_current": "1570.0",
        "aircraft_type": "Twin turboprop",
        "fleet_status": "active",
        "specs": {
            "Seats": "9",
            "Range": "1,500+ nm",
            "RVSM": "Yes",
        },
    },
    {
        "registration_number": "N28HF",
        "model": "SR22T",
        "manufacturer": "Cirrus",
        "engine_type": "Continental IO-550-N",
        "year_built": 2022,
        "location": "KBFI",
        "tach_current": "412.8",
        "hobbs_current": "418.5",
        "aircraft_type": "Single-engine piston",
        "fleet_status": "active",
        "specs": {
            "CAPS": "Equipped",
            "Useful load": "1,028 lb",
            "Avionics": "Garmin Perspective+",
        },
    },
    {
        "registration_number": "N821HF",
        "model": "Baron G58",
        "manufacturer": "Beechcraft",
        "engine_type": "Continental IO-550-C",
        "year_built": 2018,
        "location": "KBFI",
        "tach_current": "1088.4",
        "hobbs_current": "1094.1",
        "aircraft_type": "Twin piston",
        "fleet_status": "active",
        "specs": {
            "Engines": "2 × IO-550-C",
            "Useful load": "1,400 lb",
            "IFR certified": "Yes",
        },
    },
    {
        "registration_number": "N915HF",
        "model": "208B Grand Caravan",
        "manufacturer": "Cessna",
        "engine_type": "PT6A-114A",
        "year_built": 2015,
        "location": "KPAE",
        "tach_current": "4210.5",
        "hobbs_current": "4218.0",
        "aircraft_type": "Single-engine turboprop",
        "fleet_status": "active",
        "specs": {
            "Cargo door": "Large aft",
            "Seats": "9 pax / cargo combi",
            "Deice": "Boots + heated props",
        },
    },
]

# (part_number, name, description, qty, stock_alert, shop_location)
PARTS_CATALOG = {
    "MS20470AD4-4": ("Rivet, universal", "3/32 in universal head rivet", 240, 50, "Crib A-12"),
    "AN960-416": ("Washer, flat", "1/4 in flat washer", 85, 25, "Crib A-14"),
    "CH48110-1": ("Oil filter", "Lycoming IO-360 oil filter", 2, 3, "Hangar 1 — Shelf 2"),
    "06-5046-1": ("Brake lining", "Main wheel brake lining set", 4, 2, "Hangar 1 — LG"),
    "S9413-285": ("Seal, O-ring", "Hydraulic O-ring kit", 12, 6, "Crib B-3"),
    "LW-15738": ("Spark plug", "Champion REM38E — IO-360/550", 8, 4, "Engine room — Bin 7"),
    "10-349071": ("Fuel strainer", "Gascolator screen element", 3, 2, "Hangar 1 — Shelf 4"),
    "33-401-1": ("Nav light lens", "Left wingtip nav lens — 172/Cirrus", 2, 1, "Avionics cage"),
    "66-106": ("Tire, main", "6.00-6 6-ply main tire", 2, 1, "Tire rack — Bay 2"),
    "P846-1": ("Prop seal", "Prop governor seal kit — M350", 1, 1, "Hangar 2 — Drawer 3"),
    "23080-001": ("Ignition lead", "High-tension lead — Baron", 4, 2, "Electrical bench"),
    "C208-FUEL-01": ("Fuel nozzle", "Caravan PT6 fuel nozzle gasket set", 1, 1, "Turbine shelf"),
    "KA350-BRAKE": ("Brake disc", "King Air 350 main wheel disc", 1, 1, "Turbine hangar"),
    "SR22-ELT": ("ELT battery", "406 MHz ELT replacement cell", 2, 1, "Avionics cage"),
    "AN3-4A": ("Bolt, machine", "10-32 machine bolt — sheet metal", 120, 30, "Crib A-10"),
    "MS21919WDG4": ("Clamp, cushion", "Fuel line cushion clamp", 36, 12, "Crib B-1"),
    "NAS1149F0332P": ("Washer, countersunk", "Countersunk washer — control rigging", 64, 16, "Crib A-16"),
    "P/N 800063": ("Alternator belt", "Baron alternator drive belt", 1, 1, "Engine room"),
}

# Common hardware on every tail + type-specific lines (each Part row is tied to one aircraft).
UNIVERSAL_PART_NUMBERS = [
    "MS20470AD4-4",
    "AN960-416",
    "AN3-4A",
    "MS21919WDG4",
    "NAS1149F0332P",
]

TAIL_PART_NUMBERS = {
    "N172HF": ["CH48110-1", "33-401-1", "LW-15738", "10-349071", "66-106", "S9413-285"],
    "N46HF": ["06-5046-1", "P846-1", "66-106", "10-349071", "CH48110-1", "S9413-285"],
    "N350HF": ["KA350-BRAKE", "CH48110-1", "S9413-285", "10-349071", "C208-FUEL-01", "66-106"],
    "N28HF": ["SR22-ELT", "33-401-1", "LW-15738", "CH48110-1", "06-5046-1", "10-349071"],
    "N821HF": ["23080-001", "P/N 800063", "LW-15738", "S9413-285", "CH48110-1", "06-5046-1"],
    "N915HF": ["C208-FUEL-01", "S9413-285", "66-106", "10-349071", "CH48110-1", "AN960-416"],
}

# Part numbers must exist on the WO aircraft catalog (see TAIL_PART_NUMBERS).
WORK_ORDER_PART_ASSIGNMENTS = {
    "100-hour inspection due": ["CH48110-1", "33-401-1", "LW-15738"],
    "Caravan prop deice boot": ["C208-FUEL-01", "S9413-285", "66-106"],
    "M350 brake and tire inspection": ["06-5046-1", "66-106", "P846-1"],
    "SR22 autopilot rigging check": ["SR22-ELT", "33-401-1", "LW-15738"],
    "Baron alternator troubleshooting": ["P/N 800063", "23080-001", "LW-15738"],
    "King Air 300-hour inspection": ["KA350-BRAKE", "CH48110-1", "S9413-285", "10-349071"],
}

FLIGHT_SPECS = [
    ("HF101", "N46HF", "KBFI", "KPDX", 2, 1, "charter", "commercial", "scheduled"),
    ("HF102", "N350HF", "KPAE", "KBOI", 3, 1, "charter", "airline", "approved"),
    ("HF103", "N350HF", "KBOI", "KPAE", 4, 3, "positioning", "airline", "pending approval"),
    ("HF201", "N28HF", "KBFI", "KBFI", 1, 0, "training", "private", "approved"),
    ("HF202", "N172HF", "KBFI", "KUIL", 1, 0, "training", "private", "pending approval"),
    ("HF203", "N28HF", "KBFI", "KTIW", 5, 0, "training", "private", "approved"),
    ("HF204", "N821HF", "KBFI", "KPDX", 2, 1, "charter", "commercial", "scheduled"),
    ("HF205", "N821HF", "KPDX", "KBFI", 1, 2, "charter", "commercial", "approved"),
    ("HF301", "N915HF", "KPAE", "KMWH", 3, 0, "charter", "commercial", "approved"),
    ("HF302", "N915HF", "KMWH", "KPAE", 5, 1, "charter", "commercial", "completed"),
    ("HF401", "N46HF", "KPAE", "KBFI", 0, 1, "positioning", "commercial", "completed"),
    ("HF402", "N350HF", "KPAE", "KSEA", -1, 0, "maintenance ferry", "airline", "completed"),
    ("HF501", "N28HF", "KBFI", "KOLM", 6, 0, "training", "private", "scheduled"),
    ("HF502", "N172HF", "KUIL", "KBFI", 7, 0, "training", "private", "delayed"),
    ("HF601", "N821HF", "KBFI", "KGEG", 8, 2, "charter", "commercial", "approved"),
    ("HF602", "N46HF", "KBFI", "KSFO", 9, 1, "charter", "commercial", "pending approval"),
    ("HF701", "N915HF", "KPAE", "KBLI", 10, 0, "charter", "commercial", "scheduled"),
    ("HF702", "N350HF", "KPAE", "KPDX", 11, 2, "charter", "airline", "approved"),
    ("HF203A", "N172HF", "KBFI", "KBFI", 3, 0, "training", "private", "approved"),
    ("HF203B", "N172HF", "KBFI", "KUIL", 5, 2, "training", "private", "scheduled"),
    ("HF203C", "N172HF", "KUIL", "KBFI", 8, 0, "training", "private", "approved"),
]

# Maintenance intervals for /fleet/:id — hours_remaining / days_remaining drive compliance chips.
INTERVALS_BY_REG = {
    "N172HF": [
        {
            "name": "100-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 100,
            "last_done_tach": 1148.0,
            "last_done_hobbs": 1152.0,
            "submitted_by": "Mike Torres",
            "notes": "Tied to open 100-hour WO; nav light squawk from last post-flight.",
        },
        {
            "name": "50-hour oil change",
            "interval_type": "hours",
            "due_every_hours": 50,
            "last_done_tach": 1205.0,
            "last_done_hobbs": 1209.0,
            "submitted_by": "Lisa Park",
            "notes": "Filter and screen per Lycoming SI; stock CH48110-1 on hand.",
        },
        {
            "name": "Annual inspection",
            "interval_type": "days",
            "due_every_days": 365,
            "days_ago": 358,
            "submitted_by": "Mike Torres",
            "notes": "Calendar annual due within the week; schedule with owner.",
        },
        {
            "name": "ELT battery replacement",
            "interval_type": "days",
            "due_every_days": 730,
            "days_ago": 420,
            "submitted_by": "Carlos Mendez",
            "notes": "406 MHz cell within limits; verify during annual.",
        },
        {
            "name": "AD 2020-26-16 elevator cable",
            "interval_type": "both",
            "due_every_hours": 100,
            "due_every_days": 365,
            "last_done_tach": 1125.0,
            "days_ago": 400,
            "is_ad": True,
            "ad_number": "2020-26-16",
            "ad_revision": "A",
            "submitted_by": "Mike Torres",
            "notes": "Recurring AD — overdue on hours; inspect before next revenue flight.",
        },
    ],
    "N46HF": [
        {
            "name": "100-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 100,
            "last_done_tach": 810.0,
            "submitted_by": "Lisa Park",
            "notes": "Last completed at KPAE; brake/tire WO in progress.",
        },
        {
            "name": "Annual inspection",
            "interval_type": "days",
            "due_every_days": 365,
            "days_ago": 200,
            "submitted_by": "Mike Torres",
            "notes": "In compliance; next due Q4.",
        },
        {
            "name": "Propeller overhaul",
            "interval_type": "hours",
            "due_every_hours": 2000,
            "last_done_tach": 650.0,
            "submitted_by": "Carlos Mendez",
            "notes": "Hartzell hub — ample hours remaining.",
        },
        {
            "name": "Altimeter / static system",
            "interval_type": "days",
            "due_every_days": 730,
            "days_ago": 710,
            "submitted_by": "Lisa Park",
            "notes": "Pitot-static cert due soon; coordinate with avionics shop.",
        },
    ],
    "N350HF": [
        {
            "name": "300-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 300,
            "last_done_tach": 1280.0,
            "submitted_by": "Lisa Park",
            "notes": "King Air phase inspection; open WO on file.",
        },
        {
            "name": "12-month inspection",
            "interval_type": "days",
            "due_every_days": 365,
            "days_ago": 340,
            "submitted_by": "Mike Torres",
            "notes": "Due soon; deice boot squawk under review.",
        },
        {
            "name": "Landing gear overhaul",
            "interval_type": "hours",
            "due_every_hours": 5000,
            "last_done_tach": 1200.0,
            "submitted_by": "Carlos Mendez",
            "notes": "Cycle-limited components tracked in work order system.",
        },
    ],
    "N28HF": [
        {
            "name": "100-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 100,
            "last_done_tach": 340.0,
            "submitted_by": "Mike Torres",
            "notes": "SR22 phase; autopilot rigging WO open.",
        },
        {
            "name": "CAPS repack",
            "interval_type": "days",
            "due_every_days": 3650,
            "days_ago": 900,
            "submitted_by": "Carlos Mendez",
            "notes": "Parachute system within calendar limit.",
        },
        {
            "name": "Annual inspection",
            "interval_type": "days",
            "due_every_days": 365,
            "days_ago": 120,
            "submitted_by": "Mike Torres",
            "notes": "In compliance.",
        },
    ],
    "N821HF": [
        {
            "name": "100-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 100,
            "last_done_tach": 1010.0,
            "submitted_by": "Carlos Mendez",
            "notes": "Alternator troubleshooting WO active.",
        },
        {
            "name": "Annual inspection",
            "interval_type": "days",
            "due_every_days": 365,
            "days_ago": 280,
            "submitted_by": "Lisa Park",
            "notes": "ELT G-switch squawk noted on walk-around.",
        },
        {
            "name": "Engine hot section",
            "interval_type": "hours",
            "due_every_hours": 1800,
            "last_done_tach": 900.0,
            "submitted_by": "Mike Torres",
            "notes": "Per engine monitoring program — OK.",
        },
    ],
    "N915HF": [
        {
            "name": "100-hour inspection",
            "interval_type": "hours",
            "due_every_hours": 100,
            "last_done_tach": 4145.0,
            "submitted_by": "Carlos Mendez",
            "notes": "Prop deice boot replacement in progress.",
        },
        {
            "name": "PT6 hot section",
            "interval_type": "hours",
            "due_every_hours": 3500,
            "last_done_tach": 3800.0,
            "submitted_by": "Mike Torres",
            "notes": "Approaching hot section — plan at next 100-hour.",
        },
        {
            "name": "Annual inspection",
            "interval_type": "days",
            "due_every_days": 365,
            "days_ago": 90,
            "submitted_by": "Lisa Park",
            "notes": "Recently completed; cargo door seal closed as observation only.",
        },
        {
            "name": "AD 2015-19-10 fuel nozzle",
            "interval_type": "hours",
            "due_every_hours": 500,
            "last_done_tach": 4000.0,
            "is_ad": True,
            "ad_number": "2015-19-10",
            "ad_revision": "B",
            "submitted_by": "Carlos Mendez",
            "notes": "Recurring fuel nozzle gasket AD — in compliance.",
        },
    ],
}

DISCREPANCY_SPECS = [
    ("N172HF", "james.rivera", "Left nav light intermittent on ground run-up.", "33-40", "1247.3", "pending", None),
    ("N172HF", "rachel.kim", "Rough mag check on R engine at 1700 RPM.", "74-00", "1245.1", "pending", "100-hour inspection due"),
    ("N28HF", "emily.chen", "Autopilot roll servo hunts in HDG mode above 8k ft.", "22-11", "410.2", "pending", None),
    ("N46HF", "alex.nguyen", "Cabin altitude warning chime spurious on descent.", "21-30", "891.0", "pending", None),
    ("N821HF", "tom.brennan", "Right alternator ammeter flicker during taxi.", "24-30", "1087.9", "pending", None),
    ("N350HF", "david.okonkwo", "Deice boot outer wing slow to inflate.", "30-11", "1563.5", "pending", None),
    ("N915HF", "james.rivera", "Cargo door seal worn — wind noise above 120 KIAS.", "52-30", "4209.8", "closed", None),
    ("N915HF", "mike.torres", "Found chipped prop deice boot during walk-around.", "61-10", "4208.0", "pending", "Caravan prop deice boot"),
    ("N46HF", "lisa.park", "Main tire flat-spotted — recommend replacement.", "32-40", "892.1", "pending", "M350 brake and tire inspection"),
    ("N821HF", "carlos.mendez", "ELT G-switch requires safety wire replacement.", "25-60", "1088.0", "pending", None),
    ("N28HF", "rachel.kim", "PFD airspeed disagree >5 kt during slow flight.", "34-11", "412.5", "pending", None),
    ("N350HF", "sarah.mitchell", "Dispatch note: pax reported cabin odor — trace OK.", "21-20", "1564.0", "closed", None),
]

WORK_ORDER_SPECS = [
    ("100-hour inspection due", "N172HF", "mike.torres", "marcus.hale", "open", "medium", 32, "1247.3"),
    ("Caravan prop deice boot", "N915HF", "carlos.mendez", "marcus.hale", "in_progress", "high", 30, "4208.0"),
    ("M350 brake and tire inspection", "N46HF", "lisa.park", "marcus.hale", "awaiting_parts", "medium", 32, "892.1"),
    ("SR22 autopilot rigging check", "N28HF", "mike.torres", "marcus.hale", "open", "medium", 22, "410.2"),
    ("Baron alternator troubleshooting", "N821HF", "carlos.mendez", "marcus.hale", "in_progress", "high", 24, "1087.9"),
    ("King Air 300-hour inspection", "N350HF", "lisa.park", "marcus.hale", "open", "medium", 5, "1563.5"),
]


class Command(BaseCommand):
    help = "Expand Horizon Flight Services demo data (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Company PK (default: lookup by name).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        company = self._resolve_company(options["company_id"])
        if company is None:
            return

        users = {}
        users["marcus.hale"] = self._ensure_owner(company)
        users.update(self._ensure_pilots(company))
        users.update(self._ensure_mechanics(company))
        users.update(self._ensure_dispatchers(company))

        aircraft = self._ensure_aircraft(company)
        inv = Inventory.objects.filter(company=company).first()
        if inv is None:
            inv = Inventory.objects.create(company=company)

        parts_by_reg = self._ensure_parts(aircraft, inv)
        work_orders = self._ensure_work_orders(company, aircraft, users, parts_by_reg)
        disc_count = self._ensure_discrepancies(aircraft, users, work_orders)
        flight_count = self._ensure_flights(company, aircraft, users)
        interval_count = self._ensure_maintenance_intervals(aircraft)
        wo_part_count = WorkOrderPart.objects.filter(
            work_order__aircraft__company=company
        ).count()

        call_command(
            "bootstrap_component_history",
            company_id=company.id,
            verbosity=0,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Horizon demo ready on {company.name} (id={company.id}): "
                f"{Profile.objects.filter(company=company).count()} users, "
                f"{Aircraft.objects.filter(company=company).count()} aircraft, "
                f"{Flight.objects.filter(company=company).count()} flights, "
                f"{AircraftMaintenanceInterval.objects.filter(aircraft__company=company).count()} "
                f"maintenance intervals ({interval_count} new this run), "
                f"{Part.objects.filter(aircraft__company=company).count()} catalog part(s), "
                f"{InventoryPart.objects.filter(inventory__company=company).count()} inventory lines, "
                f"{wo_part_count} work-order part line(s), "
                f"{Discrepancy.objects.filter(aircraft__company=company).count()} discrepancies "
                f"({disc_count} new this run)."
            )
        )

    def _resolve_company(self, company_id):
        if company_id is not None:
            company = Company.objects.filter(pk=company_id).first()
        else:
            company = Company.objects.filter(name=COMPANY_NAME).first()
        if company is None:
            self.stdout.write(
                self.style.ERROR(
                    f"Company not found ({COMPANY_NAME!r}). Create it in Site Admin first."
                )
            )
        return company

    def _ensure_owner(self, company):
        user, created = Profile.objects.get_or_create(
            username="marcus.hale",
            defaults={
                "first_name": "Marcus",
                "last_name": "Hale",
                "email": "marcus.hale@horizonflight.demo",
                "company": company,
                "company_role": "owner",
                "employee_id": 1001,
            },
        )
        if created:
            user.set_password(DEFAULT_PASSWORD)
            user.save()
        return user

    def _ensure_pilots(self, company):
        users = {}
        medical = date.today() + timedelta(days=180)
        for idx, (username, first, last, email, cert) in enumerate(PILOTS, start=1):
            user, created = Profile.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "email": email,
                    "company": company,
                    "company_role": "pilot",
                    "employee_id": 2000 + idx,
                },
            )
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
                    "employee_id": 3000 + idx,
                },
            )
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
                    "employee_id": 4000 + idx,
                },
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
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
        """Insert when production schema has extra NOT NULL columns (created_at, hobbs_time)."""
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

    @staticmethod
    def _interval_notes(submitted_by, body):
        who = (submitted_by or "").strip()
        text = (body or "").strip()
        if who and text:
            return f"[Submitted By: {who}]\n{text}"
        if who:
            return f"[Submitted By: {who}]"
        return text

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
                    last_done_date = today - timedelta(days=int(row["days_ago"]))
                _, was_created = AircraftMaintenanceInterval.objects.update_or_create(
                    aircraft=ac,
                    name=row["name"],
                    defaults={
                        "interval_type": row.get("interval_type", "hours"),
                        "due_every_hours": row.get("due_every_hours"),
                        "due_every_days": row.get("due_every_days"),
                        "last_done_tach": row.get("last_done_tach"),
                        "last_done_hobbs": row.get("last_done_hobbs"),
                        "last_done_date": last_done_date,
                        "is_ad": row.get("is_ad", False),
                        "ad_number": row.get("ad_number", ""),
                        "ad_revision": row.get("ad_revision", ""),
                        "notes": self._interval_notes(
                            row.get("submitted_by"), row.get("notes", "")
                        ),
                        "is_active": True,
                    },
                )
                if was_created:
                    created += 1
        return created

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
        created_lines = 0
        for reg, ac in aircraft_by_reg.items():
            if ac is None:
                continue
            parts_by_reg[reg] = {}
            for pn in self._part_numbers_for_reg(reg):
                name, desc, qty, alert, loc = PARTS_CATALOG[pn]
                part, _ = Part.objects.update_or_create(
                    part_number=pn,
                    aircraft=ac,
                    defaults={"name": name, "description": desc},
                )
                parts_by_reg[reg][pn] = part
                _, line_new = InventoryPart.objects.update_or_create(
                    inventory=inventory,
                    part=part,
                    defaults={
                        "quantity": qty,
                        "stock_alert": alert,
                        "shop_location": loc,
                    },
                )
                if line_new:
                    created_lines += 1
        return parts_by_reg

    def _ensure_work_orders(self, company, aircraft_by_reg, users, parts_by_reg):
        owner = users.get("marcus.hale")
        work_orders = {}
        for title, reg, assignee_key, _creator_key, status, priority, ata, tach in WORK_ORDER_SPECS:
            ac = aircraft_by_reg.get(reg)
            assignee = users.get(assignee_key)
            if not ac or not assignee:
                continue
            wo, _ = WorkOrder.objects.update_or_create(
                aircraft=ac,
                title=title,
                defaults={
                    "created_by": owner,
                    "assignee": assignee,
                    "description": f"Scheduled maintenance — {title}.",
                    "status": status,
                    "priority": priority,
                    "ATA_code": ata,
                    "tach_time": tach,
                    "due_by": date.today() + timedelta(days=14),
                    "components_affected": title.split()[0],
                },
            )
            work_orders[title] = wo
            reg_parts = parts_by_reg.get(reg, {})
            for pn in WORK_ORDER_PART_ASSIGNMENTS.get(title, []):
                part = reg_parts.get(pn)
                if part is None:
                    continue
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

        base = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0)
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
            if secondary.id == primary.id and len(pilots) > 1:
                secondary = pilots[(pilot_idx + 2) % len(pilots)]
            dispatcher = dispatchers[pilot_idx % len(dispatchers)] if dispatchers else None

            dep = base + timedelta(days=day_offset)
            arr = dep + timedelta(hours=1, minutes=30)
            if origin == destination:
                arr = dep + timedelta(hours=2)

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
