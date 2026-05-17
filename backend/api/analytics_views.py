"""
Analytics workspace (Phase 2 — 3.2.1, 3.2.2): maintenance and fleet performance aggregates.
"""

from collections import defaultdict
from datetime import datetime, timedelta
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Aircraft, Discrepancy, Flight, WorkOrder
from .permissions import IsManagerOrOwner
from .views import get_request_company

DEFAULT_RANGE_DAYS = 90
OPERATIONAL_HOURS_PER_DAY = 12  # conservative available-hours assumption per tail


def _parse_range(request):
    today = timezone.localdate()
    raw_from = request.GET.get("date_from")
    raw_to = request.GET.get("date_to")
    date_to = parse_date(raw_to) if raw_to else today
    date_from = (
        parse_date(raw_from)
        if raw_from
        else (date_to - timedelta(days=DEFAULT_RANGE_DAYS))
    )
    if date_from is None:
        date_from = today - timedelta(days=DEFAULT_RANGE_DAYS)
    if date_to is None:
        date_to = today
    if date_from > date_to:
        date_from, date_to = date_to, date_from
    start_dt = timezone.make_aware(datetime.combine(date_from, datetime.min.time()))
    end_dt = timezone.make_aware(datetime.combine(date_to, datetime.max.time()))
    days = max(1, (date_to - date_from).days + 1)
    return date_from, date_to, start_dt, end_dt, days


def _optional_aircraft_id(request):
    raw = request.GET.get("aircraft_id")
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _optional_ata(request):
    """ATA chapter filter — numeric only (e.g. 29, 32)."""
    raw = (request.GET.get("ata") or "").strip()
    if not raw or not raw.isdigit():
        return None
    return int(raw)


def _flight_duration_hours(flight):
    dep = flight.departure_time
    arr = flight.arrival_time
    if not dep or not arr or arr <= dep:
        return 0.0
    return (arr - dep).total_seconds() / 3600.0


def _wo_touch_hours(wo):
    if wo.created_at and wo.updated_at and wo.status == "closed":
        delta = wo.updated_at - wo.created_at
        hours = delta.total_seconds() / 3600.0
        return min(max(hours, 0.25), 40.0)
    return 0.0


@api_view(["GET"])
@permission_classes([IsManagerOrOwner])
def maintenance_analytics_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({"error": "User does not have an associated company"}, status=403)

    date_from, date_to, start_dt, end_dt, days = _parse_range(request)
    aircraft_id = _optional_aircraft_id(request)
    ata_filter = _optional_ata(request)
    group_by = (request.GET.get("group_by") or "month").lower()
    if group_by not in ("week", "month"):
        group_by = "month"

    aircraft_qs = Aircraft.objects.filter(company=company)
    if aircraft_id is not None:
        aircraft_qs = aircraft_qs.filter(pk=aircraft_id)
    aircraft_ids = list(aircraft_qs.values_list("id", flat=True))
    tail_by_id = {
        row["id"]: row["registration_number"] or f"#{row['id']}"
        for row in aircraft_qs.values("id", "registration_number")
    }

    wo_qs = WorkOrder.objects.filter(
        aircraft_id__in=aircraft_ids,
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    ).select_related("aircraft")
    if ata_filter is not None:
        wo_qs = wo_qs.filter(ATA_code=ata_filter)

    disc_qs = Discrepancy.objects.filter(
        aircraft_id__in=aircraft_ids,
        date_reported__gte=date_from,
        date_reported__lte=date_to,
    ).select_related("aircraft")
    if ata_filter is not None:
        ata_str = str(ata_filter)
        disc_qs = disc_qs.filter(
            Q(ata_code=ata_str)
            | Q(ata_code__startswith=f"{ata_str}-")
            | Q(ata_code__startswith=f"{ata_str}.")
        )

    issue_counts = defaultdict(lambda: {"count": 0, "aircraft_ids": set(), "labels": set()})

    for wo in wo_qs:
        ata_key = str(wo.ATA_code) if wo.ATA_code is not None else "—"
        component = (wo.components_affected or wo.title or "Work order").strip()[:80]
        key = (ata_key, component.lower())
        bucket = issue_counts[key]
        bucket["count"] += 1
        bucket["ata"] = ata_key
        bucket["label"] = component
        bucket["aircraft_ids"].add(wo.aircraft_id)

    for disc in disc_qs:
        ata_key = (disc.ata_code or "—").strip() or "—"
        component = (disc.description or "Discrepancy").strip()[:80]
        key = (ata_key, component.lower())
        bucket = issue_counts[key]
        bucket["count"] += 1
        bucket["ata"] = ata_key
        bucket["label"] = component
        bucket["aircraft_ids"].add(disc.aircraft_id)

    recurring = []
    for (_ata, _label), bucket in issue_counts.items():
        if bucket["count"] < 2:
            continue
        tails = sorted(
            tail_by_id.get(aid, f"#{aid}") for aid in bucket["aircraft_ids"]
        )
        recurring.append(
            {
                "ata_code": bucket.get("ata", "—"),
                "label": bucket.get("label", "Issue"),
                "count": bucket["count"],
                "aircraft_tails": tails,
                "aircraft_count": len(bucket["aircraft_ids"]),
            }
        )
    recurring.sort(key=lambda x: (-x["count"], x["label"]))

    # Labor proxy from closed WO touch time (until LaborEntry exists).
    labor_series = defaultdict(float)
    for wo in wo_qs.filter(status="closed"):
        if not wo.updated_at:
            continue
        period_key = wo.updated_at.strftime("%Y-%m" if group_by == "month" else "%Y-W%W")
        labor_series[period_key] += _wo_touch_hours(wo)

    labor_points = [
        {"period": k, "hours": round(v, 1)}
        for k, v in sorted(labor_series.items())
    ]

    flights = Flight.objects.filter(
        company=company,
        aircraft_id__in=aircraft_ids,
        departure_time__gte=start_dt,
        departure_time__lte=end_dt,
    ).exclude(status="cancelled")
    flight_hours = sum(_flight_duration_hours(f) for f in flights)

    maintenance_events = wo_qs.count() + disc_qs.count()
    events_per_100_fh = (
        round(100.0 * maintenance_events / flight_hours, 2)
        if flight_hours > 0
        else None
    )

    return Response(
        {
            "range": {"date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
            "filters": {
                "aircraft_id": aircraft_id,
                "ata": ata_filter,
                "group_by": group_by,
            },
            "recurring_issues": recurring[:25],
            "labor_hours": {
                "available": False,
                "source": "work_order_touch_time_proxy",
                "note": "Estimated from closed work order duration until LaborEntry is available.",
                "series": labor_points,
            },
            "maintenance_rate": {
                "maintenance_events": maintenance_events,
                "flight_hours": round(flight_hours, 1),
                "events_per_100_flight_hours": events_per_100_fh,
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsManagerOrOwner])
def fleet_performance_analytics_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({"error": "User does not have an associated company"}, status=403)

    date_from, date_to, start_dt, end_dt, days = _parse_range(request)
    aircraft_id = _optional_aircraft_id(request)

    aircraft_qs = Aircraft.objects.filter(company=company).prefetch_related("work_orders")
    if aircraft_id is not None:
        aircraft_qs = aircraft_qs.filter(pk=aircraft_id)

    available_hours_per_tail = days * OPERATIONAL_HOURS_PER_DAY

    utilization = []
    uptime_rows = []

    flights_qs = Flight.objects.filter(
        company=company,
        departure_time__gte=start_dt,
        departure_time__lte=end_dt,
    ).exclude(status="cancelled").select_related("aircraft")

    flight_hours_by_aircraft = defaultdict(float)
    for fl in flights_qs:
        if fl.aircraft_id:
            flight_hours_by_aircraft[fl.aircraft_id] += _flight_duration_hours(fl)

    downtime_statuses = {"maintenance_due", "aog", "grounded"}

    for ac in aircraft_qs:
        tail = ac.registration_number or f"#{ac.id}"
        fh = round(flight_hours_by_aircraft.get(ac.id, 0.0), 1)
        avail = float(available_hours_per_tail)
        util_pct = round(min(100.0, 100.0 * fh / avail), 1) if avail else 0.0
        utilization.append(
            {
                "aircraft_id": ac.id,
                "tail": tail,
                "flight_hours": fh,
                "available_hours": avail,
                "utilization_percent": util_pct,
            }
        )

        open_wo = ac.work_orders.exclude(status="closed").count()
        if ac.fleet_status in downtime_statuses:
            maintenance_h = avail * 0.5
        elif open_wo:
            maintenance_h = min(avail, open_wo * 8.0)
        else:
            maintenance_h = 0.0
        maintenance_h = min(maintenance_h, max(0.0, avail - fh))
        idle_h = max(0.0, avail - fh - maintenance_h)
        uptime_rows.append(
            {
                "aircraft_id": ac.id,
                "tail": tail,
                "fleet_status": ac.fleet_status,
                "open_work_orders": open_wo,
                "flying_hours": fh,
                "maintenance_hours": round(maintenance_h, 1),
                "idle_hours": round(idle_h, 1),
                "uptime_percent": round(100.0 * (fh + idle_h) / avail, 1) if avail else 0,
            }
        )

    utilization.sort(key=lambda x: -x["utilization_percent"])

    all_flights_qs = Flight.objects.filter(
        company=company,
        departure_time__gte=start_dt,
        departure_time__lte=end_dt,
    )
    if aircraft_id is not None:
        all_flights_qs = all_flights_qs.filter(aircraft_id=aircraft_id)
    total_flights = all_flights_qs.count()
    delayed = all_flights_qs.filter(status="delayed").count()
    cancelled = all_flights_qs.filter(status="cancelled").count()
    completed = all_flights_qs.filter(status="completed").count()
    on_time = max(0, total_flights - delayed - cancelled)

    delay_breakdown = [
        {"status": "completed", "label": "Completed", "count": completed},
        {"status": "delayed", "label": "Delayed", "count": delayed},
        {"status": "cancelled", "label": "Cancelled", "count": cancelled},
        {
            "status": "other",
            "label": "Scheduled / approved / pending",
            "count": max(0, total_flights - completed - delayed - cancelled),
        },
    ]

    on_time_pct = (
        round(100.0 * on_time / total_flights, 1) if total_flights else None
    )

    return Response(
        {
            "range": {"date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
            "filters": {"aircraft_id": aircraft_id},
            "utilization": utilization,
            "uptime_by_aircraft": uptime_rows,
            "on_time_performance": {
                "total_flights": total_flights,
                "on_time_count": on_time,
                "on_time_percent": on_time_pct,
                "delay_breakdown": [d for d in delay_breakdown if d["count"] > 0],
            },
        }
    )
