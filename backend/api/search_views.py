"""
Site-wide search (Phase 2 — 3.4.1): grouped, role-scoped results for the command palette.
"""

from django.db.models import Q

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Flight
from .permissions import IsCompanyMember
from .views import (
    _is_platform_admin,
    _request_role,
    company_scoped_aircraft_queryset,
    company_scoped_discrepancy_queryset,
    company_scoped_workorder_queryset,
    get_request_company,
    inventory_parts_queryset_for_request,
)

PER_CATEGORY_LIMIT = 5
MIN_QUERY_LEN = 2

# Mirrors frontend MODULE_ALLOWED_ROLES / RBAC MVP matrix.
SEARCH_CATEGORIES_BY_ROLE = {
    "owner": ("aircraft", "work_orders", "discrepancies", "parts", "flights"),
    "manager": ("aircraft", "work_orders", "discrepancies", "parts", "flights"),
    "dispatcher": ("aircraft", "work_orders", "flights"),
    "mechanic": ("aircraft", "work_orders", "discrepancies", "parts", "flights"),
    "pilot": ("flights", "discrepancies"),
}

GROUP_LABELS = {
    "aircraft": "Aircraft",
    "work_orders": "Work orders",
    "discrepancies": "Discrepancies",
    "parts": "Parts",
    "flights": "Flights",
}


def _allowed_categories(request):
    user = request.user
    if _is_platform_admin(user):
        return SEARCH_CATEGORIES_BY_ROLE["owner"]
    role = _request_role(user)
    return SEARCH_CATEGORIES_BY_ROLE.get(role, ())


def _item(entity_type, entity_id, title, subtitle="", meta=None):
    return {
        "type": entity_type,
        "id": entity_id,
        "title": title,
        "subtitle": subtitle or "",
        "meta": meta or {},
    }


def _search_aircraft(qs, q):
    needle = q.strip()
    filters = (
        Q(registration_number__icontains=needle)
        | Q(model__icontains=needle)
        | Q(manufacturer__icontains=needle)
        | Q(aircraft_type__icontains=needle)
    )
    if needle.isdigit():
        filters |= Q(pk=int(needle))
    rows = qs.filter(filters).order_by("registration_number")[:PER_CATEGORY_LIMIT]
    items = []
    for ac in rows:
        subtitle = (ac.model or ac.aircraft_type or "").strip()
        if ac.manufacturer and subtitle:
            subtitle = f"{ac.manufacturer} · {subtitle}"
        elif ac.manufacturer:
            subtitle = ac.manufacturer
        items.append(
            _item(
                "aircraft",
                ac.id,
                (ac.registration_number or f"Aircraft #{ac.id}").strip(),
                subtitle,
            )
        )
    return items


def _search_work_orders(qs, q):
    needle = q.strip()
    filters = (
        Q(title__icontains=needle)
        | Q(description__icontains=needle)
        | Q(components_affected__icontains=needle)
        | Q(aircraft__registration_number__icontains=needle)
    )
    if needle.isdigit():
        filters |= Q(pk=int(needle))
    rows = qs.filter(filters).select_related("aircraft")[:PER_CATEGORY_LIMIT]
    items = []
    for wo in rows:
        reg = getattr(wo.aircraft, "registration_number", "") or ""
        items.append(
            _item(
                "work_order",
                wo.id,
                wo.title or f"Work order #{wo.id}",
                f"#{wo.id} · {reg} · {wo.get_status_display()}",
                {"status": wo.status},
            )
        )
    return items


def _search_discrepancies(qs, q, request):
    needle = q.strip()
    filters = (
        Q(description__icontains=needle)
        | Q(ata_code__icontains=needle)
        | Q(aircraft__registration_number__icontains=needle)
    )
    if needle.isdigit():
        filters |= Q(pk=int(needle))
    role = _request_role(request.user)
    if role == "pilot" and not _is_platform_admin(request.user):
        qs = qs.filter(reporter=request.user)
    rows = qs.filter(filters).select_related("aircraft")[:PER_CATEGORY_LIMIT]
    items = []
    for disc in rows:
        reg = getattr(disc.aircraft, "registration_number", "") or ""
        items.append(
            _item(
                "discrepancy",
                disc.id,
                (disc.description or f"Discrepancy #{disc.id}")[:120],
                f"#{disc.id} · {reg} · {disc.get_status_display()}",
                {"status": disc.status},
            )
        )
    return items


def _search_parts(request, q):
    needle = q.strip()
    qs = inventory_parts_queryset_for_request(request).filter(
        Q(part__part_number__icontains=needle)
        | Q(part__name__icontains=needle)
        | Q(part__description__icontains=needle)
        | Q(shop_location__icontains=needle)
    )
    rows = qs[:PER_CATEGORY_LIMIT]
    items = []
    for line in rows:
        part = line.part
        qty = line.quantity
        items.append(
            _item(
                "part",
                part.id,
                f"{part.part_number} — {part.name}",
                f"Qty {qty}" + (f" · {line.shop_location}" if line.shop_location else ""),
            )
        )
    return items


def _search_flights(company, q):
    if company is None:
        return []
    needle = q.strip()
    qs = Flight.objects.filter(company=company).select_related(
        "aircraft", "primary_pilot"
    )
    filters = (
        Q(flight_number__icontains=needle)
        | Q(origin__icontains=needle)
        | Q(destination__icontains=needle)
        | Q(route__icontains=needle)
        | Q(aircraft__registration_number__icontains=needle)
    )
    if needle.isdigit():
        filters |= Q(pk=int(needle))
    rows = qs.filter(filters).order_by("-departure_time")[:PER_CATEGORY_LIMIT]
    items = []
    for fl in rows:
        route = " → ".join(
            p for p in (fl.origin, fl.destination) if p
        ) or (fl.route or "")
        reg = getattr(fl.aircraft, "registration_number", "") or ""
        subtitle = route
        if reg:
            subtitle = f"{reg} · {subtitle}" if subtitle else reg
        label = fl.flight_number or f"Flight #{fl.id}"
        items.append(_item("flight", fl.id, label, subtitle, {"status": fl.status}))
    return items


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsCompanyMember])
def global_search_view(request):
    q = (request.GET.get("q") or "").strip()
    if len(q) < MIN_QUERY_LEN:
        return Response({"query": q, "groups": []})

    categories = _allowed_categories(request)
    company = get_request_company(request)
    groups = []

    if "aircraft" in categories:
        items = _search_aircraft(company_scoped_aircraft_queryset(request), q)
        if items:
            groups.append(
                {"key": "aircraft", "label": GROUP_LABELS["aircraft"], "items": items}
            )

    if "work_orders" in categories:
        items = _search_work_orders(company_scoped_workorder_queryset(request), q)
        if items:
            groups.append(
                {
                    "key": "work_orders",
                    "label": GROUP_LABELS["work_orders"],
                    "items": items,
                }
            )

    if "discrepancies" in categories:
        items = _search_discrepancies(
            company_scoped_discrepancy_queryset(request), q, request
        )
        if items:
            groups.append(
                {
                    "key": "discrepancies",
                    "label": GROUP_LABELS["discrepancies"],
                    "items": items,
                }
            )

    if "parts" in categories:
        items = _search_parts(request, q)
        if items:
            groups.append(
                {"key": "parts", "label": GROUP_LABELS["parts"], "items": items}
            )

    if "flights" in categories:
        items = _search_flights(company, q)
        if items:
            groups.append(
                {"key": "flights", "label": GROUP_LABELS["flights"], "items": items}
            )

    return Response({"query": q, "groups": groups})
