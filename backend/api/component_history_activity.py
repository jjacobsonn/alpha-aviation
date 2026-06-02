"""Audit log for component history record and timeline edits."""

from django.utils import timezone

from .models import ComponentHistoryActivity, ComponentEvent, InstalledComponent


def _actor_for_request(request):
    user = getattr(request, "user", None) if request else None
    if user and user.is_authenticated:
        return user
    return None


def _display_name(user):
    if not user:
        return "System"
    fn = (user.first_name or "").strip()
    ln = (user.last_name or "").strip()
    full = f"{fn} {ln}".strip()
    return full or user.username or str(user.id)


def _label(value):
    if value is None or value == "":
        return "(empty)"
    return str(value)


def snapshot_component(component):
    return {
        "part_number": component.part_number,
        "part_name": component.part_name,
        "serial_number": component.serial_number,
        "location": component.location,
        "aircraft_id": component.aircraft_id,
        "limit_type": component.limit_type,
        "limit_value": str(component.limit_value) if component.limit_value is not None else None,
        "used_value": str(component.used_value) if component.used_value is not None else None,
        "limit_due_date": (
            component.limit_due_date.isoformat() if component.limit_due_date else None
        ),
        "notes": component.notes,
    }


def snapshot_event(event):
    return {
        "event_type": event.event_type,
        "occurred_at": event.occurred_at.isoformat() if event.occurred_at else None,
        "summary": event.summary,
        "aircraft_id": event.aircraft_id,
        "work_order_id": event.work_order_id,
    }


def describe_component_changes(before, after):
    labels = {
        "location": "Location",
        "limit_type": "Life limit type",
        "limit_value": "Life limit",
        "used_value": "Used",
        "limit_due_date": "Due date",
        "notes": "Notes",
        "aircraft_id": "Aircraft",
    }
    parts = []
    for key, label in labels.items():
        if before.get(key) != after.get(key):
            parts.append(f"{label}: {_label(before.get(key))} → {_label(after.get(key))}")
    return "; ".join(parts)


def describe_event_changes(before, after):
    labels = {
        "event_type": "Event type",
        "occurred_at": "Date/time",
        "summary": "Summary",
        "aircraft_id": "Aircraft",
        "work_order_id": "Work order",
    }
    parts = []
    for key, label in labels.items():
        if before.get(key) != after.get(key):
            parts.append(f"{label}: {_label(before.get(key))} → {_label(after.get(key))}")
    return "; ".join(parts)


def log_component_updated(component, before, after, request, *, component_event=None):
    msg = describe_component_changes(before, after)
    if not msg:
        return
    editor = _display_name(_actor_for_request(request))
    ComponentHistoryActivity.objects.create(
        component=component,
        component_event=component_event,
        actor=_actor_for_request(request),
        event_type=ComponentHistoryActivity.EventType.UPDATED,
        summary=f"{editor} updated component record: {msg}",
        metadata={"before": before, "after": after},
    )


def log_event_updated(event, before, after, request):
    msg = describe_event_changes(before, after)
    if not msg:
        return
    editor = _display_name(_actor_for_request(request))
    ComponentHistoryActivity.objects.create(
        component=event.component,
        component_event=event,
        actor=_actor_for_request(request),
        event_type=ComponentHistoryActivity.EventType.UPDATED,
        summary=f"{editor} updated timeline entry: {msg}",
        metadata={"before": before, "after": after},
    )
