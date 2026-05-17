"""
Labor entries on work orders — log, list, update, delete mechanic hours.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import LaborEntry
from .permissions import IsMechanicOrManager, IsServiceHistoryReader
from .serializers import LaborEntrySerializer
from .views import company_scoped_workorder_queryset, get_request_company


def _get_work_order(request, work_order_pk):
    qs = company_scoped_workorder_queryset(request)
    return qs.filter(pk=work_order_pk).first()


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def work_order_labor_entries(request, work_order_pk):
    company = get_request_company(request)
    if company is None and not getattr(request.user, "is_staff", False):
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )

    work_order = _get_work_order(request, work_order_pk)
    if work_order is None:
        return Response({"error": "Work order not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        if not IsServiceHistoryReader().has_permission(request, None):
            role = getattr(request.user, "company_role", None)
            if role not in {"owner", "manager", "mechanic", "dispatcher"} and not getattr(
                request.user, "is_staff", False
            ):
                return Response(status=status.HTTP_403_FORBIDDEN)
        entries = work_order.labor_entries.select_related("mechanic", "created_by")
        return Response(LaborEntrySerializer(entries, many=True).data)

    if not IsMechanicOrManager().has_permission(request, None):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = LaborEntrySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    mechanic = serializer.validated_data.get("mechanic") or request.user
    entry = LaborEntry.objects.create(
        work_order=work_order,
        mechanic=mechanic,
        hours=serializer.validated_data["hours"],
        work_date=serializer.validated_data["work_date"],
        notes=serializer.validated_data.get("notes") or "",
        created_by=request.user,
    )
    return Response(
        LaborEntrySerializer(entry).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsMechanicOrManager])
def work_order_labor_entry_detail(request, work_order_pk, entry_pk):
    work_order = _get_work_order(request, work_order_pk)
    if work_order is None:
        return Response({"error": "Work order not found"}, status=status.HTTP_404_NOT_FOUND)

    entry = work_order.labor_entries.filter(pk=entry_pk).first()
    if entry is None:
        return Response({"error": "Labor entry not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = LaborEntrySerializer(entry, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
