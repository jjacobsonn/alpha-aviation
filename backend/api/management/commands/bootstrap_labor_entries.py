"""
Backfill one labor entry per closed work order that has no entries (non-destructive).
Uses touch-time estimate capped like analytics proxy.
"""

from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import LaborEntry, WorkOrder


def _estimate_hours(wo):
    if not wo.created_at or not wo.updated_at:
        return Decimal("1.0")
    hours = (wo.updated_at - wo.created_at).total_seconds() / 3600.0
    return Decimal(str(round(min(max(hours, 0.25), 40.0), 2)))


class Command(BaseCommand):
    help = "Create estimated labor entries for closed work orders missing labor data."

    def handle(self, *args, **options):
        created = 0
        for wo in WorkOrder.objects.filter(status="closed").prefetch_related("labor_entries"):
            if wo.labor_entries.exists():
                continue
            mechanic = wo.assignee or wo.created_by
            work_date = wo.signature_date or (
                wo.updated_at.date() if wo.updated_at else timezone.localdate()
            )
            LaborEntry.objects.create(
                work_order=wo,
                mechanic=mechanic,
                hours=_estimate_hours(wo),
                work_date=work_date,
                notes="Auto-estimated from work order duration (bootstrap)",
                created_by=mechanic,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} labor entries."))
