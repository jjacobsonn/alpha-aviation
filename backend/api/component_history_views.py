"""
Component history (Phase 2 — 3.3.2): P/N and S/N search, timeline, audit CSV export.
"""

import csv
from io import StringIO
import re

from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response

from .models import Company, ComponentEvent, InstalledComponent
from .permissions import IsComponentHistoryReader
from .serializers import (
    ComponentEventSerializer,
    InstalledComponentCreateSerializer,
    InstalledComponentDetailSerializer,
    InstalledComponentListSerializer,
)
from .views import get_request_company, _is_platform_admin


class CSVRenderer(BaseRenderer):
    """Allow Accept: text/csv on export without 406 from DRF content negotiation."""

    media_type = "text/csv"
    format = "csv"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


def _safe_export_filename_part(value):
    text = str(value or "").strip()
    if not text:
        return ""
    # Keep header-safe filename tokens only.
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", text)
    cleaned = cleaned.strip("-.")
    return cleaned


def _resolve_component_history_company(request):
    """
    Tenant users: profile company. Platform admins: X-Company-Id header, else first
    company (demo-friendly when admin has not opened Organization picker).
    """
    company = get_request_company(request)
    if company is not None:
        return company
    user = getattr(request, "user", None)
    if user and getattr(user, "company_id", None):
        return user.company
    if user and _is_platform_admin(user):
        return Company.objects.order_by("id").first()
    return None


def _company_components_qs(request):
    company = _resolve_component_history_company(request)
    if company is None:
        return None, None
    return company, InstalledComponent.objects.filter(company=company).select_related(
        "aircraft", "part"
    )


def _paginate(qs, request):
    try:
        page = max(1, int(request.GET.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(50, max(1, int(request.GET.get("page_size", 20))))
    except (TypeError, ValueError):
        page_size = 20
    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size
    return qs[start:end], total, page, page_size


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsComponentHistoryReader])
def component_history_list(request):
    company, qs = _company_components_qs(request)
    if company is None and not getattr(request.user, "is_staff", False):
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "POST":
        company = _resolve_component_history_company(request)
        if company is None:
            return Response(
                {
                    "error": (
                        "No company context. Tenant users need a company on their profile; "
                        "platform admins should open Organizations and select a company, "
                        "or set the X-Company-Id header."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = InstalledComponentCreateSerializer(
            data=request.data, context={"request": request, "company": company}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        initial_summary = (data.pop("initial_event_summary", None) or "").strip()
        part = data.get("part")
        component = InstalledComponent.objects.create(company=company, **data)
        summary = initial_summary or (
            f"Registered {component.part_number}"
            + (f" S/N {component.serial_number}" if component.serial_number else "")
        )
        ComponentEvent.objects.create(
            component=component,
            event_type=ComponentEvent.EventType.INSTALL,
            occurred_at=timezone.now(),
            aircraft=component.aircraft,
            summary=summary,
            actor=request.user,
        )
        detail = InstalledComponent.objects.annotate(event_count=Count("events")).get(
            pk=component.pk
        )
        return Response(
            InstalledComponentDetailSerializer(detail).data,
            status=status.HTTP_201_CREATED,
        )

    if qs is None:
        qs = InstalledComponent.objects.none()

    q = (request.GET.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(part_number__icontains=q)
            | Q(serial_number__icontains=q)
            | Q(part_name__icontains=q)
            | Q(location__icontains=q)
            | Q(aircraft__registration_number__icontains=q)
        )

    component_type = (request.GET.get("component_type") or "").strip()
    if component_type in ("serialized", "consumable"):
        qs = qs.filter(component_type=component_type)

    qs = qs.annotate(event_count=Count("events")).order_by("part_number", "serial_number")
    page_qs, total, page, page_size = _paginate(qs, request)
    serializer = InstalledComponentListSerializer(page_qs, many=True)
    return Response(
        {
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": serializer.data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsComponentHistoryReader])
def component_history_detail(request, pk):
    company, qs = _company_components_qs(request)
    if company is None and not getattr(request.user, "is_staff", False):
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )
    if qs is None:
        return Response({"error": "Component not found"}, status=status.HTTP_404_NOT_FOUND)

    component = (
        qs.prefetch_related("events__aircraft", "events__work_order", "events__actor")
        .filter(pk=pk)
        .first()
    )
    if component is None:
        return Response({"error": "Component not found"}, status=status.HTTP_404_NOT_FOUND)

    data = InstalledComponentDetailSerializer(component).data
    events = component.events.all()
    data["events"] = ComponentEventSerializer(events, many=True).data
    return Response(data)


@api_view(["GET"])
@renderer_classes([CSVRenderer])
@permission_classes([IsAuthenticated, IsComponentHistoryReader])
def component_history_export(request, pk):
    company, qs = _company_components_qs(request)
    if company is None and not getattr(request.user, "is_staff", False):
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )
    if qs is None:
        return Response({"error": "Component not found"}, status=status.HTTP_404_NOT_FOUND)

    component = qs.prefetch_related("events__aircraft", "events__work_order").filter(pk=pk).first()
    if component is None:
        return Response({"error": "Component not found"}, status=status.HTTP_404_NOT_FOUND)

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Component History Audit Export"])
    writer.writerow(["Exported at", timezone.now().isoformat()])
    writer.writerow(["Part number", component.part_number])
    writer.writerow(["Part name", component.part_name])
    writer.writerow(["Serial number", component.serial_number or "—"])
    writer.writerow(["Type", component.component_type])
    tail = ""
    if component.aircraft:
        tail = component.aircraft.registration_number or ""
    writer.writerow(["Current aircraft", tail or "—"])
    writer.writerow(["Location", component.location or "—"])
    writer.writerow(["Limit type", component.limit_type or "—"])
    writer.writerow(["Limit value", component.limit_value or "—"])
    writer.writerow(["Used", component.used_value or "—"])
    writer.writerow(["Remaining", component.remaining_value if component.remaining_value is not None else "—"])
    writer.writerow(["Limit due date", component.limit_due_date or "—"])
    writer.writerow([])
    writer.writerow(["Event date", "Type", "Aircraft", "Work order", "Summary"])

    for ev in component.events.all():
        ac_tail = ""
        if ev.aircraft:
            ac_tail = ev.aircraft.registration_number or ""
        wo_ref = f"WO #{ev.work_order_id}" if ev.work_order_id else ""
        writer.writerow(
            [
                ev.occurred_at.isoformat() if ev.occurred_at else "",
                ev.event_type,
                ac_tail,
                wo_ref,
                ev.summary,
            ]
        )

    part_token = _safe_export_filename_part(component.part_number) or str(component.id)
    filename = f"component-{part_token}"
    serial_token = _safe_export_filename_part(component.serial_number)
    if serial_token:
        filename += f"-{serial_token}"
    filename += ".csv"

    response = HttpResponse(buffer.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
