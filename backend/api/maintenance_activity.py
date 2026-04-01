"""Append-only work order / discrepancy activity logging."""

from .models import DiscrepancyActivity, WorkOrderActivity


def _actor_for_request(request):
    user = getattr(request, "user", None) if request else None
    if user and user.is_authenticated:
        return user
    return None


def _work_order_part_ids(wo):
    return sorted(wo.parts_needed.values_list("id", flat=True))


def snapshot_work_order(wo):
    return {
        "status": wo.status,
        "title": wo.title,
        "description": wo.description or "",
        "due_by": wo.due_by.isoformat() if wo.due_by else None,
        "created_by_id": wo.created_by_id,
        "aircraft_id": wo.aircraft_id,
        "part_ids": _work_order_part_ids(wo),
    }


def describe_work_order_changes(before, after):
    bits = []
    if before["status"] != after["status"]:
        bits.append(f"Status {before['status']} → {after['status']}")
    if before["title"] != after["title"]:
        bits.append("Title updated")
    if (before["description"] or "").strip() != (after["description"] or "").strip():
        bits.append("Description updated")
    if before["due_by"] != after["due_by"]:
        bits.append("Due date updated")
    if before["created_by_id"] != after["created_by_id"]:
        bits.append("Assignee updated")
    if before["aircraft_id"] != after["aircraft_id"]:
        bits.append("Aircraft updated")
    if before["part_ids"] != after["part_ids"]:
        bits.append("Parts list updated")
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
        metadata={},
    )


def snapshot_discrepancy(d):
    return {
        "status": d.status,
        "description": d.description or "",
        "ata_code": d.ata_code or "",
        "tach_time": d.tach_time or "",
        "work_order_id": d.work_order_id,
        "aircraft_id": d.aircraft_id,
        "reporter_id": d.reporter_id,
    }


def describe_discrepancy_changes(before, after):
    bits = []
    if before["status"] != after["status"]:
        bits.append(f"Status {before['status']} → {after['status']}")
    if (before["description"] or "").strip() != (after["description"] or "").strip():
        bits.append("Description updated")
    if (before["ata_code"] or "").strip() != (after["ata_code"] or "").strip():
        bits.append("ATA updated")
    if (before["tach_time"] or "").strip() != (after["tach_time"] or "").strip():
        bits.append("Tach updated")
    if before["work_order_id"] != after["work_order_id"]:
        bits.append("Linked work order updated")
    if before["aircraft_id"] != after["aircraft_id"]:
        bits.append("Aircraft updated")
    if before["reporter_id"] != after["reporter_id"]:
        bits.append("Reporter updated")
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
        metadata={},
    )
