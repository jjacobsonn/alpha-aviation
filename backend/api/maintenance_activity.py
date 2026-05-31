"""Append-only work order / discrepancy activity logging."""

from .models import (
    Aircraft,
    DiscrepancyActivity,
    Flight,
    FlightActivity,
    Part,
    Profile,
    WorkOrderActivity,
)


def _actor_for_request(request):
    user = getattr(request, "user", None) if request else None
    if user and user.is_authenticated:
        return user
    return None


def _display_name(user):
    if not user:
        return "Unassigned"
    fn = (user.first_name or "").strip()
    ln = (user.last_name or "").strip()
    full = f"{fn} {ln}".strip()
    return full or user.username or str(user.id)


def _aircraft_label(aircraft):
    if not aircraft:
        return "None"
    return f"{aircraft.registration_number or ''} ({aircraft.model or ''})".strip() or str(aircraft.id)


def _work_order_part_ids(wo):
    return sorted(wo.parts_needed.values_list("id", flat=True))


def _work_order_part_map(wo):
    """Return {part_id: 'P-XXXX — Name'} for current parts on the work order."""
    return {
        p.id: f"{p.part_number} — {p.name}"
        for p in wo.parts_needed.all()
    }


def _status_label(value):
    if value is None:
        return "—"
    return str(value).replace("_", " ").strip().title()


def snapshot_work_order(wo):
    return {
        "status": wo.status,
        "priority": wo.priority,
        "title": wo.title,
        "description": wo.description or "",
        "due_by": wo.due_by.isoformat() if wo.due_by else None,
        "created_by_id": wo.created_by_id,
        "created_by_name": _display_name(wo.created_by) if wo.created_by_id else "Unassigned",
        "aircraft_id": wo.aircraft_id,
        "aircraft_name": _aircraft_label(wo.aircraft) if wo.aircraft_id else "None",
        "part_ids": _work_order_part_ids(wo),
        "part_map": _work_order_part_map(wo),
    }


def describe_work_order_changes(before, after):
    bits = []
    if before["status"] != after["status"]:
        bits.append(
            f"Status {_status_label(before['status'])} → {_status_label(after['status'])}"
        )
    if before["title"] != after["title"]:
        bits.append(f"Title → {after['title']}")
    if before["priority"] != after["priority"]:
        bits.append(
            f"Priority {_status_label(before['priority'])} → {_status_label(after['priority'])}"
        )
    if (before["description"] or "").strip() != (after["description"] or "").strip():
        bits.append("Description updated")
    if before["due_by"] != after["due_by"]:
        old_due = before["due_by"] or "None"
        new_due = after["due_by"] or "None"
        bits.append(f"Due date {old_due} → {new_due}")
    if before["created_by_id"] != after["created_by_id"]:
        old_name = before.get("created_by_name") or "Unassigned"
        new_name = after.get("created_by_name") or "Unassigned"
        bits.append(f"Assignee {old_name} → {new_name}")
    if before["aircraft_id"] != after["aircraft_id"]:
        old_ac = before.get("aircraft_name") or "None"
        new_ac = after.get("aircraft_name") or "None"
        bits.append(f"Aircraft {old_ac} → {new_ac}")
    if before["part_ids"] != after["part_ids"]:
        added_ids = set(after["part_ids"]) - set(before["part_ids"])
        removed_ids = set(before["part_ids"]) - set(after["part_ids"])
        after_map = after.get("part_map", {})
        before_map = before.get("part_map", {})
        parts_bits = []
        if added_ids:
            names = [after_map.get(pid, f"#{pid}") for pid in sorted(added_ids)]
            parts_bits.append(f"Added {', '.join(names)}")
        if removed_ids:
            names = [before_map.get(pid, f"#{pid}") for pid in sorted(removed_ids)]
            parts_bits.append(f"Removed {', '.join(names)}")
        bits.append("Parts: " + "; ".join(parts_bits))
    return "; ".join(bits) if bits else None


def log_work_order_created(wo, request):
    WorkOrderActivity.objects.create(
        work_order=wo,
        actor=_actor_for_request(request),
        event_type=WorkOrderActivity.EventType.CREATED,
        summary=f"Work order created: {wo.title}",
        metadata={"status": wo.status},
    )


def log_work_order_updated(wo, before, after, request):
    msg = describe_work_order_changes(before, after)
    if not msg:
        return
    WorkOrderActivity.objects.create(
        work_order=wo,
        actor=_actor_for_request(request),
        event_type=WorkOrderActivity.EventType.UPDATED,
        summary=msg,
        metadata={"before": before, "after": after},
    )


def snapshot_discrepancy(d):
    return {
        "status": d.status,
        "description": d.description or "",
        "ata_code": d.ata_code or "",
        "tach_time": d.tach_time or "",
        "work_order_id": d.work_order_id,
        "work_order_title": (d.work_order.title if d.work_order else None),
        "aircraft_id": d.aircraft_id,
        "aircraft_name": _aircraft_label(d.aircraft) if d.aircraft_id else "None",
        "reporter_id": d.reporter_id,
        "reporter_name": _display_name(d.reporter) if d.reporter_id else "Unknown",
    }


def describe_discrepancy_changes(before, after):
    bits = []
    if before["status"] != after["status"]:
        bits.append(
            f"Status {_status_label(before['status'])} → {_status_label(after['status'])}"
        )
    if (before["description"] or "").strip() != (after["description"] or "").strip():
        bits.append("Description updated")
    if (before["ata_code"] or "").strip() != (after["ata_code"] or "").strip():
        old_ata = before["ata_code"] or "None"
        new_ata = after["ata_code"] or "None"
        bits.append(f"ATA {old_ata} → {new_ata}")
    if (before["tach_time"] or "").strip() != (after["tach_time"] or "").strip():
        old_tach = before["tach_time"] or "None"
        new_tach = after["tach_time"] or "None"
        bits.append(f"Tach {old_tach} → {new_tach}")
    if before["work_order_id"] != after["work_order_id"]:
        old_wo = f"#{before['work_order_id']}" if before["work_order_id"] else "None"
        new_wo = f"#{after['work_order_id']}" if after["work_order_id"] else "None"
        new_title = after.get("work_order_title")
        if new_title:
            new_wo = f"#{after['work_order_id']} ({new_title})"
        bits.append(f"Linked work order {old_wo} → {new_wo}")
    if before["aircraft_id"] != after["aircraft_id"]:
        old_ac = before.get("aircraft_name") or "None"
        new_ac = after.get("aircraft_name") or "None"
        bits.append(f"Aircraft {old_ac} → {new_ac}")
    if before["reporter_id"] != after["reporter_id"]:
        old_rp = before.get("reporter_name") or "Unknown"
        new_rp = after.get("reporter_name") or "Unknown"
        bits.append(f"Reporter {old_rp} → {new_rp}")
    return "; ".join(bits) if bits else None


def log_discrepancy_created(d, request):
    DiscrepancyActivity.objects.create(
        discrepancy=d,
        actor=_actor_for_request(request),
        event_type=DiscrepancyActivity.EventType.CREATED,
        summary=f"Discrepancy reported on {d.aircraft}",
        metadata={"status": d.status},
    )


def log_discrepancy_updated(d, before, after, request):
    msg = describe_discrepancy_changes(before, after)
    if not msg:
        return
    DiscrepancyActivity.objects.create(
        discrepancy=d,
        actor=_actor_for_request(request),
        event_type=DiscrepancyActivity.EventType.UPDATED,
        summary=msg,
        metadata={"before": before, "after": after},
    )


def _pilot_label(pilot_id):
    if not pilot_id:
        return "None"
    try:
        return _display_name(Profile.objects.get(pk=pilot_id))
    except Profile.DoesNotExist:
        return f"User #{pilot_id}"


def _dt_label(value):
    if not value:
        return "None"
    return str(value).replace("T", " ").replace("+00:00", " UTC")[:19]


def snapshot_flight(flight):
    return {
        "departure_time": (
            flight.departure_time.isoformat() if flight.departure_time else None
        ),
        "arrival_time": (
            flight.arrival_time.isoformat() if flight.arrival_time else None
        ),
        "route": (flight.route or "").strip(),
        "secondary_pilot_id": flight.secondary_pilot_id,
        "secondary_pilot_name": _pilot_label(flight.secondary_pilot_id),
        "status": flight.status,
        "origin": flight.origin or "",
        "destination": flight.destination or "",
    }


def describe_flight_changes(before, after):
    bits = []
    if before["departure_time"] != after["departure_time"]:
        bits.append(
            f"Departure {_dt_label(before['departure_time'])} → "
            f"{_dt_label(after['departure_time'])}"
        )
    if before["arrival_time"] != after["arrival_time"]:
        bits.append(
            f"Arrival {_dt_label(before['arrival_time'])} → "
            f"{_dt_label(after['arrival_time'])}"
        )
    if (before["route"] or "") != (after["route"] or ""):
        old_route = before["route"] or "None"
        new_route = after["route"] or "None"
        bits.append(f"Route {old_route} → {new_route}")
    if before["secondary_pilot_id"] != after["secondary_pilot_id"]:
        bits.append(
            f"Secondary pilot {before['secondary_pilot_name']} → "
            f"{after['secondary_pilot_name']}"
        )
    if before["status"] != after["status"]:
        bits.append(
            f"Status {_status_label(before['status'])} → {_status_label(after['status'])}"
        )
    if before["origin"] != after["origin"]:
        bits.append(f"Origin {before['origin'] or 'None'} → {after['origin'] or 'None'}")
    if before["destination"] != after["destination"]:
        bits.append(
            f"Destination {before['destination'] or 'None'} → "
            f"{after['destination'] or 'None'}"
        )
    return "; ".join(bits) if bits else None


def log_flight_created(flight, request):
    actor = _actor_for_request(request)
    who = _display_name(actor) if actor else "System"
    FlightActivity.objects.create(
        flight=flight,
        actor=actor,
        event_type=FlightActivity.EventType.CREATED,
        summary=f"Flight request submitted by {who}",
        metadata={"status": flight.status},
    )


def log_flight_updated(flight, before, after, request):
    msg = describe_flight_changes(before, after)
    if not msg:
        return
    FlightActivity.objects.create(
        flight=flight,
        actor=_actor_for_request(request),
        event_type=FlightActivity.EventType.UPDATED,
        summary=msg,
        metadata={"before": before, "after": after},
    )
