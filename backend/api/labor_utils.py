"""Helpers for labor hour totals and analytics aggregation."""

from collections import defaultdict
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import Coalesce

from .models import LaborEntry, WorkOrder


def work_order_labor_total(work_order) -> float:
    agg = work_order.labor_entries.aggregate(
        total=Coalesce(Sum("hours"), Decimal("0"))
    )
    return float(agg["total"] or 0)


def labor_hours_series_for_analytics(
    *,
    aircraft_ids,
    date_from,
    date_to,
    group_by,
    ata_filter=None,
):
    """
    Returns (points, meta) where points are [{period, hours}, ...].
  meta describes data source.
    """
    qs = LaborEntry.objects.filter(
        work_order__aircraft_id__in=aircraft_ids,
        work_date__gte=date_from,
        work_date__lte=date_to,
    ).select_related("work_order")

    if ata_filter is not None:
        qs = qs.filter(work_order__ATA_code=ata_filter)

    labor_series = defaultdict(float)
    for entry in qs:
        period_key = entry.work_date.strftime(
            "%Y-%m" if group_by == "month" else "%Y-W%W"
        )
        labor_series[period_key] += float(entry.hours)

    if labor_series:
        points = [
            {"period": k, "hours": round(v, 1)}
            for k, v in sorted(labor_series.items())
        ]
        return points, {
            "available": True,
            "source": "labor_entries",
            "note": "Summed from mechanic labor entries logged on work orders.",
            "entry_count": qs.count(),
        }

    # Fallback: closed WO touch-time proxy when no entries exist yet
    wo_qs = WorkOrder.objects.filter(
        aircraft_id__in=aircraft_ids,
        status="closed",
        updated_at__date__gte=date_from,
        updated_at__date__lte=date_to,
    )
    if ata_filter is not None:
        wo_qs = wo_qs.filter(ATA_code=ata_filter)

    proxy_series = defaultdict(float)
    for wo in wo_qs:
        if not wo.updated_at:
            continue
        period_key = wo.updated_at.strftime(
            "%Y-%m" if group_by == "month" else "%Y-W%W"
        )
        delta = wo.updated_at - wo.created_at
        hours = min(max(delta.total_seconds() / 3600.0, 0.25), 40.0)
        proxy_series[period_key] += hours

    points = [
        {"period": k, "hours": round(v, 1)} for k, v in sorted(proxy_series.items())
    ]
    return points, {
        "available": False,
        "source": "work_order_touch_time_proxy",
        "note": (
            "No labor entries logged in this period. Showing estimates from closed "
            "work order duration — log labor on work orders for accurate totals."
        ),
        "entry_count": 0,
    }
