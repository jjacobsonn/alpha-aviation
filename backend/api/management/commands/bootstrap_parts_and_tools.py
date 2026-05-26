"""
Idempotent demo data for Parts (inventory lines) and calibrated tools.

Safe to run multiple times. Does not delete existing rows.
"""

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    Aircraft,
    CalibrationRecord,
    Company,
    Inventory,
    InventoryPart,
    Part,
    Tool,
)

SAMPLE_PARTS = [
    {
        "part_number": "MS20470AD4-4",
        "name": "Rivet, universal",
        "description": "3/32 in universal head rivet — sheet metal",
        "quantity": 240,
        "stock_alert": 50,
        "shop_location": "Crib A-12",
    },
    {
        "part_number": "AN960-416",
        "name": "Washer, flat",
        "description": "1/4 in flat washer",
        "quantity": 85,
        "stock_alert": 25,
        "shop_location": "Crib A-14",
    },
    {
        "part_number": "CH48110-1",
        "name": "Oil filter",
        "description": "Engine oil filter element",
        "quantity": 2,
        "stock_alert": 3,
        "shop_location": "Hangar 1 — Shelf 2",
    },
    {
        "part_number": "06-5046-1",
        "name": "Brake lining",
        "description": "Main wheel brake lining set",
        "quantity": 4,
        "stock_alert": 2,
        "shop_location": "Hangar 1 — LG",
    },
    {
        "part_number": "S9413-285",
        "name": "Seal, O-ring",
        "description": "Hydraulic system O-ring kit",
        "quantity": 12,
        "stock_alert": 6,
        "shop_location": "Crib B-3",
    },
]

SAMPLE_TOOLS = [
    {
        "name": "Torque wrench — 3/8 drive",
        "serial_number": "TW-M350012",
        "description": "10–150 ft-lb click-type",
        "location": "Tool crib A — Shelf 3",
        "calibration_due_date": lambda today: today + timedelta(days=200),
        "calibration_history": [
            {
                "calibration_date": lambda today: today - timedelta(days=165),
                "performed_by": "J.A. King Calibration Services",
                "next_due_date": lambda today: today + timedelta(days=200),
                "notes": "Passed all tolerance checks.",
            }
        ],
    },
    {
        "name": "Digital multimeter",
        "serial_number": "DMM-FLUKE-87V-4421",
        "description": "True RMS — avionics bench",
        "location": "Avionics bench — Hangar 2",
        "calibration_due_date": lambda today: today + timedelta(days=7),
        "calibration_history": [],
    },
    {
        "name": "Hydraulic test stand",
        "serial_number": "HTS-2200-SN8842",
        "description": "5,000 psi test stand",
        "location": "Maintenance hangar — Bay 4",
        "calibration_due_date": lambda today: today - timedelta(days=45),
        "calibration_history": [
            {
                "calibration_date": lambda today: today - timedelta(days=410),
                "performed_by": "Transcat Calibration Lab",
                "next_due_date": lambda today: today - timedelta(days=45),
                "notes": "Overdue — schedule recalibration.",
            }
        ],
    },
    {
        "name": "Pressure gauge test set",
        "serial_number": "PG-TEST-0091",
        "description": "Pitot-static test set",
        "location": "Tool crib A — Cabinet 1",
        "calibration_due_date": lambda today: today + timedelta(days=90),
        "calibration_history": [],
    },
]


class Command(BaseCommand):
    help = "Add sample inventory parts and calibrated tools for each company (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Only seed this company (default: all companies).",
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        companies = Company.objects.all().order_by("id")
        if options["company_id"] is not None:
            companies = companies.filter(pk=options["company_id"])

        if not companies.exists():
            self.stdout.write(self.style.WARNING("No companies found."))
            return

        parts_created = 0
        lines_created = 0
        tools_created = 0
        cals_created = 0

        for company in companies:
            aircraft = (
                Aircraft.objects.filter(company=company).order_by("id").first()
            )
            inv = Inventory.objects.filter(company=company).order_by("id").first()
            if inv is None:
                inv = Inventory.objects.create(company=company)

            for spec in SAMPLE_PARTS:
                existing_line = (
                    InventoryPart.objects.filter(
                        inventory__company=company,
                        part__part_number=spec["part_number"],
                    )
                    .select_related("part")
                    .first()
                )
                if existing_line:
                    part = existing_line.part
                    part_new = False
                else:
                    part = Part.objects.create(
                        part_number=spec["part_number"],
                        name=spec["name"],
                        description=spec["description"],
                        aircraft=aircraft,
                    )
                    part_new = True
                if part_new:
                    parts_created += 1
                else:
                    part.name = spec["name"]
                    part.description = spec["description"]
                    part.save(update_fields=["name", "description"])

                line, line_new = InventoryPart.objects.get_or_create(
                    inventory=inv,
                    part=part,
                    defaults={
                        "quantity": spec["quantity"],
                        "stock_alert": spec["stock_alert"],
                        "shop_location": spec["shop_location"],
                    },
                )
                if line_new:
                    lines_created += 1
                else:
                    line.quantity = spec["quantity"]
                    line.stock_alert = spec["stock_alert"]
                    line.shop_location = spec["shop_location"]
                    line.save(
                        update_fields=["quantity", "stock_alert", "shop_location"]
                    )

            for spec in SAMPLE_TOOLS:
                due = spec["calibration_due_date"](today)
                tool, tool_new = Tool.objects.get_or_create(
                    company=company,
                    serial_number=spec["serial_number"],
                    defaults={
                        "name": spec["name"],
                        "description": spec["description"],
                        "location": spec["location"],
                        "calibration_due_date": due,
                    },
                )
                if tool_new:
                    tools_created += 1
                else:
                    tool.name = spec["name"]
                    tool.description = spec["description"]
                    tool.location = spec["location"]
                    tool.calibration_due_date = due
                    tool.save(
                        update_fields=[
                            "name",
                            "description",
                            "location",
                            "calibration_due_date",
                        ]
                    )

                for rec in spec.get("calibration_history") or []:
                    cal_date = rec["calibration_date"](today)
                    next_due = rec["next_due_date"](today)
                    _, cal_new = CalibrationRecord.objects.get_or_create(
                        tool=tool,
                        calibration_date=cal_date,
                        performed_by=rec["performed_by"],
                        defaults={
                            "next_due_date": next_due,
                            "notes": rec.get("notes", ""),
                        },
                    )
                    if cal_new:
                        cals_created += 1

            part_count = InventoryPart.objects.filter(inventory__company=company).count()
            tool_count = Tool.objects.filter(company=company).count()
            self.stdout.write(
                f"  {company.name} (id={company.id}): "
                f"{part_count} inventory line(s), {tool_count} tool(s)"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. New: {parts_created} part(s), {lines_created} inventory line(s), "
                f"{tools_created} tool(s), {cals_created} calibration record(s)."
            )
        )
