"""
Add demo installed components + events for the first company (non-destructive).
Safe to run multiple times — skips if any InstalledComponent already exists.
"""

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    Aircraft,
    Company,
    ComponentEvent,
    InstalledComponent,
    Part,
    WorkOrder,
)


class Command(BaseCommand):
    help = "Bootstrap component history demo data (skips if components already exist)."

    def handle(self, *args, **options):
        if InstalledComponent.objects.exists():
            self.stdout.write(self.style.WARNING("Installed components already exist — skipping."))
            return

        company = Company.objects.first()
        if not company:
            self.stdout.write(self.style.ERROR("No company found."))
            return

        aircraft = Aircraft.objects.filter(company=company).first()
        part = Part.objects.filter(aircraft=aircraft).first() if aircraft else None
        if not part:
            part = Part.objects.create(
                part_number="P-DEMO-100",
                name="Demo Hydraulic Unit",
                description="Demo component for history timeline.",
                aircraft=aircraft,
            )

        wo = WorkOrder.objects.filter(aircraft__company=company).first()

        comp = InstalledComponent.objects.create(
            company=company,
            part=part,
            part_number=part.part_number,
            part_name=part.name,
            serial_number="DEMO-SN-001",
            component_type=InstalledComponent.ComponentType.SERIALIZED,
            aircraft=aircraft,
            location="Aircraft" if aircraft else "Shop",
            limit_type=InstalledComponent.LimitType.HOURS,
            limit_value=2000,
            used_value=320,
            installed_at=date.today() - timedelta(days=400),
        )
        consumable = InstalledComponent.objects.create(
            company=company,
            part_number="P-FILTER-DEMO",
            part_name="Cabin Air Filter",
            serial_number="",
            component_type=InstalledComponent.ComponentType.CONSUMABLE,
            location="Parts room",
        )

        now = timezone.now()
        ComponentEvent.objects.create(
            component=comp,
            event_type=ComponentEvent.EventType.INSTALL,
            occurred_at=now - timedelta(days=400),
            aircraft=aircraft,
            summary=f"Installed on {aircraft.registration_number if aircraft else 'aircraft'}",
        )
        if wo:
            ComponentEvent.objects.create(
                component=comp,
                event_type=ComponentEvent.EventType.WORK_ORDER,
                occurred_at=now - timedelta(days=30),
                aircraft=aircraft,
                work_order=wo,
                summary=f"Linked to work order: {wo.title}",
            )
        ComponentEvent.objects.create(
            component=consumable,
            event_type=ComponentEvent.EventType.INSTALL,
            occurred_at=now - timedelta(days=60),
            summary="Issued from inventory",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Created component history demo data for {company.name} "
                f"(search P/N {comp.part_number} or S/N {comp.serial_number})."
            )
        )
