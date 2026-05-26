"""
Service history (Phase 2 — 3.3.1): searchable, paginated work order archive.
"""

from django.db.models import Q

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.dateparse import parse_date

from .models import WorkOrder
from .permissions import IsServiceHistoryReader
from .serializers import WorkOrderHistoryListSerializer, WorkOrderSerializer
from .views import company_scoped_workorder_queryset, get_request_company

ALLOWED_ORDERING = {
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
    "due_by",
    "-due_by",
    "id",
    "-id",
    "priority",
    "-priority",
    "ATA_code",
    "-ATA_code",
}


def _paginate(queryset, request):
    try:
        page = max(1, int(request.GET.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(100, max(1, int(request.GET.get("page_size", 25))))
    except (TypeError, ValueError):
        page_size = 25
    total = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    return queryset[start:end], total, page, page_size


def _apply_history_filters(qs, request):
    q = (request.GET.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(components_affected__icontains=q)
            | Q(aircraft__registration_number__icontains=q)
            | Q(aircraft__model__icontains=q)
        )
        if q.isdigit():
            qs = qs.filter(Q(id=int(q)) | Q(ATA_code=int(q)))

    tail = (request.GET.get("tail") or "").strip()
    if tail:
        qs = qs.filter(aircraft__registration_number__icontains=tail)

    aircraft_id = request.GET.get("aircraft_id")
    if aircraft_id:
        try:
            qs = qs.filter(aircraft_id=int(aircraft_id))
        except (TypeError, ValueError):
            pass

    ata = request.GET.get("ata")
    if ata:
        try:
            qs = qs.filter(ATA_code=int(ata))
        except (TypeError, ValueError):
            pass

    component = (request.GET.get("component") or "").strip()
    if component:
        qs = qs.filter(components_affected__icontains=component)

    status_filter = (request.GET.get("status") or "").strip()
    if status_filter and status_filter != "all":
        qs = qs.filter(status=status_filter)

    date_from = parse_date(request.GET.get("date_from") or "")
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)

    date_to = parse_date(request.GET.get("date_to") or "")
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    ordering = request.GET.get("ordering", "-updated_at")
    if ordering not in ALLOWED_ORDERING:
        ordering = "-updated_at"
    return qs.order_by(ordering)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsServiceHistoryReader])
def service_history_work_orders_list(request):
    company = get_request_company(request)
    if company is None and not getattr(request.user, "is_staff", False):
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = company_scoped_workorder_queryset(request)
    qs = _apply_history_filters(qs, request)
    page_qs, total, page, page_size = _paginate(qs, request)
    serializer = WorkOrderHistoryListSerializer(page_qs, many=True)
    return Response(
        {
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": serializer.data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsServiceHistoryReader])
def service_history_work_order_detail(request, pk):
    company = get_request_company(request)
    if company is None and not getattr(request.user, "is_staff", False):
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = company_scoped_workorder_queryset(request)
    work_order = qs.filter(pk=pk).first()
    if work_order is None:
        return Response({"error": "Work order not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(
        WorkOrderSerializer(work_order, context={"request": request}).data
    )
