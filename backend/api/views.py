from django.db.models import Count, F, IntegerField, OuterRef, Prefetch, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
import re
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view, authentication_classes, permission_classes, action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Aircraft,
    AircraftMaintenanceInterval,
    Company,
    Discrepancy,
    DiscrepancyActivity,
    Flight,
    FlightActivity,
    Inventory,
    Tool,
    CalibrationRecord,
    InstalledComponent,
    InventoryPart,
    Part,
    Profile,
    WorkOrder,
    WorkOrderActivity,
    WorkOrderPart,
)

from .permissions import (
    HasCompanyRole,
    IsCompanyMember,
    IsOwner,
    IsManagerOrOwner,
    IsMechanicOrManager,
    IsMechanicOrManagerOrPilot,
    IsOwnProfileOrManager,
    IsPlatformAdmin,
    CanReportDiscrepancy,
    CanSignWorkOrder,
)
from .maintenance_activity import (
    log_flight_created,
    log_flight_updated,
    log_work_order_created,
    snapshot_discrepancy,
    snapshot_flight,
    log_discrepancy_updated,
)
from .serializers import (
    AircraftSerializer,
    AircraftMaintenanceIntervalSerializer,
    CompanySerializer,
    DiscrepancySerializer,
    FleetAircraftDetailSerializer,
    FleetAircraftListSerializer,
    FlightSerializer,
    InventorySerializer,
    ToolSerializer,
    CalibrationRecordSerializer,
    PartSerializer,
    ProfileSerializer,
    SelfProfileUpdateSerializer,
    WorkOrderSerializer,
)


def build_user_me_response(user):
    """Payload for GET/PATCH /users/me/ (identity + org + read-only role context)."""
    pilot_info = getattr(user, "pilot_info", None)
    mechanic_info = getattr(user, "mechanic_info", None)
    data = {
        "id": user.id,
        "username": user.username,
        "email": user.email or "",
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "middle_name": user.middle_name or "",
        "phone_number": user.phone_number or "",
        "company_role": getattr(user, "company_role", None),
        "is_staff": bool(getattr(user, "is_staff", False)),
        "is_superuser": bool(getattr(user, "is_superuser", False)),
        "company": getattr(user.company, "id", None) if getattr(user, "company", None) else None,
        "company_name": getattr(user.company, "name", None) if getattr(user, "company", None) else None,
        "must_change_password": bool(getattr(user, "must_change_password", False)),
    }
    if pilot_info:
        data["pilot_certificate"] = pilot_info.pilot_certificate
        data["medically_cleared_until"] = pilot_info.medically_cleared_until
    if mechanic_info:
        data["ap_certificate_number"] = mechanic_info.AP_certificate_number
    return data


def django_validation_error_response(exc, headline="Request could not be completed."):
    """Turn model ValidationError into a JSON 400 (avoids HTML 500 in production)."""
    details = getattr(exc, "message_dict", None) or getattr(exc, "messages", None)
    payload = {"error": headline}
    if details:
        payload["details"] = details
    else:
        payload["error"] = str(exc) or headline
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)


def _is_platform_admin(user):
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
    )


def get_request_company(request):
    """
    Resolve the effective company for a request.

    - Normal users: use request.user.company
    - Platform admins: may specify X-Company-Id header to select a company context
    """
    user_company = getattr(request.user, "company", None)
    if user_company is not None:
        return user_company

    if _is_platform_admin(getattr(request, "user", None)):
        raw = request.headers.get("X-Company-Id") or request.META.get("HTTP_X_COMPANY_ID")
        if raw:
            try:
                return Company.objects.get(id=int(raw))
            except (ValueError, Company.DoesNotExist):
                return None

    return None


def _optional_company_id_from_header(request):
    raw = request.headers.get("X-Company-Id") or request.META.get("HTTP_X_COMPANY_ID")
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _request_role(user):
    return getattr(user, "company_role", None)


def inventory_parts_queryset_for_request(request):
    """
    Platform admins: all inventory lines system-wide, optionally narrowed by X-Company-Id.
    Tenant users: only lines for their profile company (header ignored).
    """
    base = InventoryPart.objects.select_related("inventory__company", "part")
    user = request.user
    if _is_platform_admin(user):
        qs = base
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            qs = qs.filter(inventory__company_id=cid)
        return qs.order_by("inventory__company_id", "part__part_number")
    company = getattr(user, "company", None)
    if company is None:
        return base.none()
    return base.filter(inventory__company=company).order_by("part__part_number")


def resolve_company_for_inventory_create(request):
    """Company bucket used when creating an InventoryPart (POST)."""
    user = request.user
    if _is_platform_admin(user):
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            try:
                return Company.objects.get(pk=cid)
            except Company.DoesNotExist:
                pass
        body_c = request.data.get("company")
        if body_c is not None:
            try:
                return Company.objects.get(pk=int(body_c))
            except (TypeError, ValueError, Company.DoesNotExist):
                pass
        raise DRFValidationError(
            {
                "detail": "Platform admin must send X-Company-Id or a numeric "
                "`company` field when creating inventory lines."
            }
        )
    company = getattr(user, "company", None)
    if company is None:
        raise DRFValidationError({"detail": "Your account has no company assignment."})
    return company


def company_scoped_aircraft_queryset(request):
    """
    Tenant users are scoped to their company aircraft.
    Platform admins can view all, optionally narrowed with X-Company-Id.
    """
    qs = Aircraft.objects.all()
    user = request.user
    if _is_platform_admin(user):
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs
    company = getattr(user, "company", None)
    if company is None:
        return qs.none()
    return qs.filter(company=company)


def fleet_aircraft_queryset(request):
    qs = Aircraft.objects.all().prefetch_related("maintenance_intervals")
    user = request.user
    if _is_platform_admin(user):
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs
    company = getattr(user, "company", None)
    if company is None:
        return qs.none()
    return qs.filter(company=company)


def company_scoped_workorder_queryset(request):
    """
    Company (or platform-admin) scope via aircraft.
    """
    qs = (
        WorkOrder.objects.select_related(
            "aircraft", "created_by", "assignee", "signed_by"
        )
        .prefetch_related(
            "parts_needed",
            Prefetch(
                "activities",
                queryset=WorkOrderActivity.objects.select_related("actor").order_by(
                    "-created_at"
                ),
            ),
            Prefetch(
                "workorderpart_set",
                queryset=WorkOrderPart.objects.select_related("part"),
            ),
        )
        .order_by("-created_at")
    )
    aircraft_qs = company_scoped_aircraft_queryset(request).values_list("id", flat=True)
    qs = qs.filter(aircraft_id__in=aircraft_qs)
    user = request.user
    if _is_platform_admin(user):
        return qs
    return qs


def flights_with_activities_queryset():
    return Flight.objects.select_related(
        "aircraft", "primary_pilot", "secondary_pilot", "company"
    ).prefetch_related(
        Prefetch(
            "activities",
            queryset=FlightActivity.objects.select_related("actor").order_by(
                "-created_at"
            ),
        )
    )


def company_scoped_flight_queryset(request):
    """Flights for the requester's company; platform admins may narrow via X-Company-Id."""
    qs = Flight.objects.all().select_related(
        "company", "aircraft", "primary_pilot", "secondary_pilot"
    ).order_by("-departure_time")
    user = request.user
    if _is_platform_admin(user):
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs
    company = getattr(user, "company", None)
    if company is None:
        return qs.none()
    return qs.filter(company=company)


def company_scoped_profile_queryset(request):
    """Profiles in the requester's company only (platform admin: all or header filter)."""
    qs = Profile.objects.all().order_by("username")
    user = request.user
    if _is_platform_admin(user):
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs
    company = getattr(user, "company", None)
    if company is None:
        return qs.none()
    return qs.filter(company=company)


def company_scoped_company_queryset(request):
    """Tenant users see only their company; platform admins see all (optional header filter)."""
    qs = Company.objects.all().order_by("name")
    user = request.user
    if _is_platform_admin(user):
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            qs = qs.filter(pk=cid)
        return qs
    company = getattr(user, "company", None)
    if company is None:
        return qs.none()
    return qs.filter(pk=company.pk)


def company_scoped_part_queryset(request):
    """Parts tied to tenant aircraft or inventory lines."""
    user = request.user
    if _is_platform_admin(user):
        cid = _optional_company_id_from_header(request)
        if cid is not None:
            return Part.objects.filter(
                Q(aircraft__company_id=cid) | Q(inventories__company_id=cid)
            ).distinct()
        return Part.objects.all()
    company = getattr(user, "company", None)
    if company is None:
        return Part.objects.none()
    return Part.objects.filter(
        Q(aircraft__company=company) | Q(inventories__company=company)
    ).distinct()


def company_scoped_discrepancy_queryset(request):
    """
    Company (or platform-admin) scope via aircraft.
    """
    qs = (
        Discrepancy.objects.select_related(
            "aircraft",
            "reporter",
            "work_order",
            "work_order__created_by",
            "work_order__assignee",
        )
        .prefetch_related(
            Prefetch(
                "activities",
                queryset=DiscrepancyActivity.objects.select_related("actor").order_by(
                    "-created_at"
                ),
            ),
        )
        .order_by("-date_reported")
    )
    aircraft_qs = company_scoped_aircraft_queryset(request).values_list("id", flat=True)
    qs = qs.filter(aircraft_id__in=aircraft_qs)
    user = request.user
    if _is_platform_admin(user):
        return qs
    return qs


from datetime import date, timedelta

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return JsonResponse({'status': 'ok'})

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # disable SessionAuthentication CSRF enforcement
@csrf_exempt
def login(request):
    """
    Login endpoint that returns JWT tokens
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        })
    else:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """
    Refresh token endpoint
    """
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        return Response(
            {'error': 'Refresh token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    except (TokenError, InvalidToken) as e:
        return Response(
            {'error': 'Invalid or expired refresh token'},
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout endpoint that blacklists the refresh token
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Current user profile (GET) or self-service contact update (PATCH).
    Aligns with backlog 1.3.1 — name, email, phone, role display; preferences/notifications later.
    """
    user = request.user
    if request.method == "PATCH":
        serializer = SelfProfileUpdateSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        user.refresh_from_db()

    return Response(build_user_me_response(user))


_PASSWORD_MIN_LENGTH = 8
_PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/`~])"
)

def _validate_password_strength(password):
    errors = []
    if len(password) < _PASSWORD_MIN_LENGTH:
        errors.append(f"Password must be at least {_PASSWORD_MIN_LENGTH} characters.")
    if not _PASSWORD_PATTERN.search(password):
        errors.append(
            "Password must contain at least one uppercase letter, one lowercase letter, "
            "one digit, and one special character."
        )
    return errors


_ROLE_HIERARCHY = {"owner": 3, "manager": 2, "dispatcher": 1, "mechanic": 1, "pilot": 1}


@api_view(["POST"])
@permission_classes([IsManagerOrOwner])
def admin_reset_password(request, pk):
    """
    Allow an owner/manager (or platform admin) to reset another user's password.
    Sets must_change_password so the employee is forced to choose their own on next login.
    """
    requester = request.user
    target = get_object_or_404(Profile, pk=pk)

    if not _is_platform_admin(requester):
        if getattr(requester, "company_id", None) != getattr(target, "company_id", None):
            return Response(
                {"detail": "You can only reset passwords for users in your own company."},
                status=status.HTTP_403_FORBIDDEN,
            )
        req_rank = _ROLE_HIERARCHY.get(getattr(requester, "company_role", ""), 0)
        tgt_rank = _ROLE_HIERARCHY.get(getattr(target, "company_role", ""), 0)
        if tgt_rank >= req_rank:
            return Response(
                {"detail": "You cannot reset the password of a user with equal or higher privilege."},
                status=status.HTTP_403_FORBIDDEN,
            )

    new_password = (request.data.get("new_password") or "").strip()
    if not new_password:
        return Response(
            {"detail": "new_password is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pw_errors = _validate_password_strength(new_password)
    if pw_errors:
        return Response({"detail": pw_errors}, status=status.HTTP_400_BAD_REQUEST)

    target.set_password(new_password)
    target.must_change_password = True
    target.save(update_fields=["password", "must_change_password"])

    return Response({"detail": "Password has been reset. The user will be prompted to set a new password on next login."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_own_password(request):
    """
    Authenticated user sets a new password (used after admin-triggered reset).
    Clears the must_change_password flag.
    """
    user = request.user
    new_password = (request.data.get("new_password") or "").strip()
    confirm_password = (request.data.get("confirm_password") or "").strip()

    if not new_password or not confirm_password:
        return Response(
            {"detail": "new_password and confirm_password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if new_password != confirm_password:
        return Response(
            {"detail": "Passwords do not match."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pw_errors = _validate_password_strength(new_password)
    if pw_errors:
        return Response({"detail": pw_errors}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password"])

    return Response({"detail": "Password updated successfully."})


#Endpoint to check the availability of aircraft given a start date and end date, and optionally to check a specific aircraft if given aircraft_id. Returns all of the flights that are available. If checking for specifc aircraft, will return just that aircraft or return empty json response if it is not available.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_aircraft_view(request):
    """ given start date/time and end date/time return list of flights that fall within that time range start_date and end_date are both required to be datetime strings
    optional if you give an aircraft id, only return flights for that aircraft
    """
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    
    aircraft_id_raw = request.GET.get("aircraft_id")
    aircraft_id = None
    if aircraft_id_raw not in (None, ""):
        try:
            aircraft_id = int(aircraft_id_raw)
        except ValueError:
            return Response({'error': 'aircraft_id must be an integer'}, status=400)

    start_date = parse_datetime(start_date_str) if start_date_str not in (None, "") else None
    end_date = parse_datetime(end_date_str) if end_date_str not in (None, "") else None


    if start_date and timezone.is_naive(start_date):
        start_date = timezone.make_aware(start_date, timezone.get_current_timezone())
    if end_date and timezone.is_naive(end_date):
        end_date = timezone.make_aware(end_date, timezone.get_current_timezone())
    if not start_date or not end_date:
        return Response({'error': 'start_date and end_date are required'}, status=400)
    if start_date > end_date:
        return Response({'error': 'start_date must be before end_date'}, status=400)

    # Scheduling overlap logic not yet on Company model; return tenant aircraft for the window.
    qs = Aircraft.objects.filter(company=company)
    if aircraft_id is not None:
        qs = qs.filter(pk=aircraft_id)
    serializer = AircraftSerializer(qs.order_by("registration_number"), many=True)
    return Response(serializer.data)

#Gets the flights for the calendar view, given start date and end date, and optionally an aircraft id, returns all the flights that fall within that date range.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def flight_list_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    aircraft_id_raw = request.GET.get("aircraft_id")
    aircraft_id = None
    if aircraft_id_raw not in (None, ""):
        try:
            aircraft_id = int(aircraft_id_raw)
        except ValueError:
            return Response({'error': 'aircraft_id must be an integer'}, status=400)

    start_date = parse_date(start_date_str) if start_date_str not in (None, "") else None
    end_date = parse_date(end_date_str) if end_date_str not in (None, "") else None
    if not start_date or not end_date:
        return Response({'error': 'start_date and end_date are required'}, status=400)
    if start_date > end_date:
        return Response({'error': 'start_date must be before end_date'}, status=400)

    qs = Flight.objects.filter(company=company).filter(
        departure_time__date__gte=start_date,
        departure_time__date__lte=end_date,
    )
    if aircraft_id is not None:
        qs = qs.filter(aircraft_id=aircraft_id)
    flights = qs.select_related("aircraft", "primary_pilot", "secondary_pilot").order_by(
        "-departure_time"
    )
    serializer = FlightSerializer(flights, many=True)
    return Response(serializer.data)

#endpoint for the management dashboard.
@api_view(['GET'])
@permission_classes([IsManagerOrOwner])
def management_dashboard_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    
    uptime_downtime = company.get_uptime_downtime()
    monthly_flight_hours = company.get_aircraft_monthly_flight_hours()
    recuring_discrepancies = company.get_company_recuring_workorders()
    remaining_hobbs = company.get_company_airplane_remaining_hobbs()
    aircraft_count = Aircraft.objects.filter(company=company).count()
    flights_count = Flight.objects.filter(company=company).count()
    workorder_analytics = company.get_company_airplane_workorder_analytics()
    open_work_orders = (
        WorkOrder.objects.filter(aircraft__company=company).exclude(status="closed").count()
    )
    pending_discrepancies = Discrepancy.objects.filter(
        aircraft__company=company, status="pending"
    ).count()

    inv_qs = InventoryPart.objects.filter(inventory__company=company).select_related(
        "part", "inventory"
    )
    low_stock_items = sum(1 for inv in inv_qs if inv.low_stock())

    role_rows = (
        Profile.objects.filter(company=company)
        .values("company_role")
        .annotate(headcount=Count("id"))
    )
    team_by_role = {row["company_role"]: row["headcount"] for row in role_rows}
    for role in [c[0] for c in Profile.role_choices]:
        team_by_role.setdefault(role, 0)

    return Response(
        {
            "company": {
                "id": company.id,
                "name": company.name,
                "locations": company.locations or "",
            },
            "counts": {
                "aircraft": aircraft_count,
                "flights": flights_count,
                "work_orders_open": open_work_orders,
                "discrepancies_pending": pending_discrepancies,
                "low_stock_items": low_stock_items,
            },
            "team_by_role": team_by_role,
            "aircraft_analytics": {
                "workorder_analytics": workorder_analytics,
                "remaining_hobbs": remaining_hobbs,
                "recuring_discrepancies": recuring_discrepancies,
                "recurring_discrepancies": recuring_discrepancies,
                "monthly_flight_hours": monthly_flight_hours,
                "uptime_downtime": uptime_downtime,
            }

        }
    )


@api_view(["GET"])
@permission_classes([IsManagerOrOwner])
def fleet_availability_dashboard_view(request):
    """
    Phase 2 — Fleet availability snapshot for management dashboard.
    Maps aircraft.fleet_status into Available / In maintenance / Grounded,
    open work orders by priority, and lightweight 7-day closure trends.
    """
    company = get_request_company(request)
    if company is None:
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )

    now = timezone.now()
    boundary_7 = now - timedelta(days=7)
    boundary_14 = now - timedelta(days=14)

    aircraft_qs = Aircraft.objects.filter(company=company)
    total_aircraft = aircraft_qs.count()

    status_counts = {
        row["fleet_status"]: row["c"]
        for row in aircraft_qs.values("fleet_status").annotate(c=Count("id"))
    }
    available = status_counts.get("active", 0)
    in_maintenance = status_counts.get("maintenance_due", 0)
    grounded = status_counts.get("aog", 0) + status_counts.get("grounded", 0)
    known_statuses = {"active", "maintenance_due", "aog", "grounded"}
    for key, val in status_counts.items():
        if key not in known_statuses:
            in_maintenance += val

    open_qs = WorkOrder.objects.filter(aircraft__company=company).exclude(
        status="closed"
    )
    open_total = open_qs.count()
    critical_open = open_qs.filter(priority="critical").count()

    priority_order = ["critical", "high", "medium", "low"]
    prio_rows = open_qs.values("priority").annotate(c=Count("id"))
    prio_map = {row["priority"]: row["c"] for row in prio_rows}
    open_by_priority = {p: prio_map.get(p, 0) for p in priority_order}

    closed_qs = WorkOrder.objects.filter(
        aircraft__company=company, status="closed"
    )
    closures_last_7d = closed_qs.filter(updated_at__gte=boundary_7).count()
    closures_prior_7d = closed_qs.filter(
        updated_at__gte=boundary_14, updated_at__lt=boundary_7
    ).count()

    available_pct = (
        round(100.0 * available / total_aircraft, 1) if total_aircraft else 0.0
    )

    return Response(
        {
            "as_of": now.isoformat(),
            "fleet": {
                "total_aircraft": total_aircraft,
                "segments": [
                    {
                        "key": "available",
                        "label": "Available",
                        "count": available,
                        "color": "#4CAF50",
                    },
                    {
                        "key": "in_maintenance",
                        "label": "In maintenance",
                        "count": in_maintenance,
                        "color": "#FF9800",
                    },
                    {
                        "key": "grounded",
                        "label": "Grounded",
                        "count": grounded,
                        "color": "#E53935",
                    },
                ],
            },
            "open_work_orders_by_priority": open_by_priority,
            "open_work_orders_total": open_total,
            "critical_open_work_orders": critical_open,
            "available_aircraft_percent": available_pct,
            "trends": {
                "closures_last_7d": closures_last_7d,
                "closures_prior_7d": closures_prior_7d,
            },
        }
    )


###
#endpoints for all of the company submodels
###

#endpoint for company's users
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_user_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    profiles = (
        Profile.objects.filter(company=company)
        .order_by("first_name", "last_name")
        .values(
            "id",
            "username",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "phone_number",
            "employee_id",
            "company_role",
        )
    )
    return Response(list(profiles))

#endpoint for company's aircrafts
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_aircraft_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    aircraft = Aircraft.objects.filter(company=company).order_by("registration_number")
    serializer = AircraftSerializer(aircraft, many=True)
    return Response(serializer.data)

#endpoint to add time to aircraft hobbs time
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_hobbs_time_view(request):
    company = request.user.company
    aircraft_id = request.data.get('aircraft_id')
    if aircraft_id is None:
        return Response({'error': 'aircraft_id is required'}, status=400)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    try:
        aircraft = Aircraft.objects.get(id=aircraft_id, company=company)
    except Aircraft.DoesNotExist:
        return Response({'error': 'Aircraft not found'}, status=404)
    
    hobbs_time_to_add = request.data.get('hobbs_time')
    if hobbs_time_to_add is None:
        return Response({'error': 'hobbs_time is required'}, status=400)
    
    try:
        hobbs_time_to_add = float(hobbs_time_to_add)
    except ValueError:
        return Response({'error': 'hobbs_time must be a number'}, status=400)

    aircraft.add_hobbs_time(hobbs_time_to_add)
    return Response({'message': f'Added {hobbs_time_to_add} hours to aircraft {aircraft.registration_number}'}, status=200)

#endpoint for company's flights
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_flights_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    flights = (
        flights_with_activities_queryset()
        .filter(company=company)
        .order_by("-departure_time")
    )
    serializer = FlightSerializer(flights, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsMechanicOrManager])
def maintenance_dashboard_view(request):
    company = request.user.company
    today = date.today()
    due_soon_threshold = today + timedelta(days=10)

    open_wos = WorkOrder.objects.filter(aircraft__company=company).exclude(status="closed")

    data = {
        "pending_discrepancies": Discrepancy.objects.filter(aircraft__company=company, status="pending").count(),
        "open_work_orders": open_wos.count(),
        "overdue": open_wos.filter(due_by__isnull=False, due_by__lt=today).count(),
        "due_soon": open_wos.filter(due_by__isnull=False, due_by__gte=today, due_by__lte=due_soon_threshold).count(),
    }
    return Response(data, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def company_flight_request_view(request):
    """
    Pilot submits a flight request (status: pending approval).
    """
    user = request.user
    if getattr(user, "company_role", None) != "pilot" and not _is_platform_admin(user):
        return Response(
            {"error": "Only pilot users can submit flight requests."},
            status=status.HTTP_403_FORBIDDEN,
        )
    company = get_request_company(request)
    if company is None:
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )

    aircraft_id = request.data.get("aircraft")
    if aircraft_id in (None, ""):
        return Response({"error": "aircraft is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        aircraft = Aircraft.objects.get(pk=int(aircraft_id), company=company)
    except (ValueError, TypeError, Aircraft.DoesNotExist):
        return Response({"error": "Invalid aircraft for this company."}, status=status.HTTP_400_BAD_REQUEST)

    dep_raw = request.data.get("departure_time")
    arr_raw = request.data.get("arrival_time")
    departure_time = parse_datetime(dep_raw) if dep_raw else None
    arrival_time = parse_datetime(arr_raw) if arr_raw else None
    if not departure_time or not arrival_time:
        return Response(
            {"error": "departure_time and arrival_time are required (ISO-8601)."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if timezone.is_naive(departure_time):
        departure_time = timezone.make_aware(departure_time, timezone.get_current_timezone())
    if timezone.is_naive(arrival_time):
        arrival_time = timezone.make_aware(arrival_time, timezone.get_current_timezone())
    if arrival_time < departure_time:
        return Response(
            {"error": "arrival_time must be after departure_time."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    sec_raw = request.data.get("secondary_pilot")
    secondary_pilot_id = None
    if sec_raw not in (None, ""):
        try:
            sp = Profile.objects.get(pk=int(sec_raw), company=company, company_role="pilot")
            if sp.id != user.id:
                secondary_pilot_id = sp.id
        except (ValueError, TypeError, Profile.DoesNotExist):
            return Response({"error": "Invalid secondary pilot."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        flight = Flight.objects.create(
            company=company,
            aircraft=aircraft,
            flight_number=request.data.get("flight_number") or None,
            origin=request.data.get("origin") or "",
            destination=request.data.get("destination") or "",
            departure_time=departure_time,
            arrival_time=arrival_time,
            route=request.data.get("route") or "",
            flight_type=request.data.get("flight_type") or "training",
            primary_pilot=user,
            secondary_pilot_id=secondary_pilot_id,
            pilot_requirement=request.data.get("pilot_requirement") or "private",
            status="pending approval",
        )
    except ValidationError as exc:
        return django_validation_error_response(
            exc,
            headline="Flight request could not be submitted.",
        )

    log_flight_created(flight, request)
    out = flights_with_activities_queryset().get(pk=flight.pk)
    serializer = FlightSerializer(out)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def company_flight_dispatch_view(request, pk):
    """
    Dispatcher or management: approve/reject/schedule flights for the company.
    """
    company = get_request_company(request)
    if company is None:
        return Response(
            {"error": "User does not have an associated company"},
            status=status.HTTP_403_FORBIDDEN,
        )
    flight = get_object_or_404(Flight.objects.filter(company=company), pk=pk)
    role = _request_role(request.user)
    is_admin = _is_platform_admin(request.user)
    is_dispatch_ops = role in {"dispatcher", "manager", "owner"} or is_admin
    is_pilot_owner = role == "pilot" and flight.primary_pilot_id == request.user.id
    if not (is_dispatch_ops or is_pilot_owner):
        return Response(
            {"error": "Dispatcher/management role required, or pilot can edit own request."},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data.copy()
    if is_pilot_owner and not is_dispatch_ops:
        # Pilot edits are limited to own request details (not operational status changes).
        allowed_fields = {
            "departure_time",
            "arrival_time",
            "route",
            "secondary_pilot",
        }
        payload_fields = set(data.keys())
        disallowed = payload_fields - allowed_fields
        if disallowed:
            return Response(
                {"error": f"Pilot cannot edit fields: {', '.join(sorted(disallowed))}."},
                status=status.HTTP_403_FORBIDDEN,
            )

    before = snapshot_flight(flight)
    try:
        serializer = FlightSerializer(flight, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        inst = serializer.save()
        new_status = data.get("status")
        if new_status == "approved" and inst.dispatcher_id is None:
            inst.dispatcher = request.user
            inst.save(update_fields=["dispatcher"])
        inst = Flight.objects.select_related(
            "aircraft", "primary_pilot", "secondary_pilot", "company"
        ).get(pk=inst.pk)
        log_flight_updated(inst, before, snapshot_flight(inst), request)
        out = flights_with_activities_queryset().get(pk=inst.pk)
        return Response(FlightSerializer(out).data)
    except ValidationError as exc:
        headline = "Flight could not be updated."
        if data.get("status") == "approved":
            headline = "Flight could not be approved."
        return django_validation_error_response(exc, headline=headline)


#endpoint for company's inventories
@api_view(['GET'])
@permission_classes([IsMechanicOrManager])
def company_inventory_view(request):
    inventories = inventory_parts_queryset_for_request(request)
    serializer = InventorySerializer(inventories, many=True)
    return Response(serializer.data)

#endpoint for company's parts for each inventory
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_low_stock_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_company_low_stock()
    return Response(data)

#endpoint for company's workorders
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_workorders_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    workorders = company_scoped_workorder_queryset(request)
    serializer = WorkOrderSerializer(
        workorders, many=True, context={"request": request}
    )
    return Response(serializer.data)

#endpoint for company's overdue workorders
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_overdue_workorders_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_overdue_workorders_data()
    return Response(data)

#endpoint for company's discrepancies
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_discrepancies_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    discrepancies = company_scoped_discrepancy_queryset(request)
    serializer = DiscrepancySerializer(
        discrepancies, many=True, context={"request": request}
    )
    return Response(serializer.data)

#endpoint that takes in the role that is wanted and checks the user in the company that is that role
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_role_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    role = request.GET.get("role")
    if not role:
        return Response({'error': 'Role parameter is required'}, status=400)
    valid_roles = [r[0] for r in Profile.role_choices]

    if role not in valid_roles:
        return Response({'error': 'Given role is not a valid role.'}, status=400)
    profiles = (
        Profile.objects.filter(company=company, company_role=role)
        .order_by("first_name", "last_name")
        .values(
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "company_role",
        )
    )
    return Response(list(profiles))




INVENTORY_LIST_ORDERING = {
    "newest": "-id",
    "oldest": "id",
    "part_number_asc": "part__part_number",
    "part_number_desc": "-part__part_number",
}


class InventoryPartsPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


def _inventory_list_summary(qs):
    """Aggregate stats for the current filtered inventory queryset."""
    agg = qs.aggregate(
        total_lines=Count("id"),
        total_units=Coalesce(Sum("quantity"), 0),
    )
    low_stock = qs.filter(stock_alert__gt=0, quantity__lte=F("stock_alert")).count()
    in_stock_lines = qs.filter(quantity__gt=0).count()
    return {
        "total_lines": agg["total_lines"] or 0,
        "total_units_on_hand": int(agg["total_units"] or 0),
        "low_stock_count": low_stock,
        "parts_in_stock_count": in_stock_lines,
    }


def _apply_inventory_list_filters(request, qs):
    q = (request.GET.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(part__part_number__icontains=q)
            | Q(part__name__icontains=q)
            | Q(part__description__icontains=q)
            | Q(shop_location__icontains=q)
        )

    status_filter = (request.GET.get("status") or "").strip()
    if status_filter == "low_stock":
        qs = qs.filter(stock_alert__gt=0, quantity__lte=F("stock_alert"))
    elif status_filter == "in_stock":
        qs = qs.filter(quantity__gt=0)
    elif status_filter == "out_of_stock":
        qs = qs.filter(quantity=0)

    ordering_key = (request.GET.get("ordering") or "newest").strip()
    order_by = INVENTORY_LIST_ORDERING.get(ordering_key, INVENTORY_LIST_ORDERING["newest"])
    return qs.order_by(order_by, "id")


class CompanyInventoryListView(generics.ListCreateAPIView):
    """
    List and create inventory records for the authenticated user's company.
    Paginated; supports q, status, and ordering (newest, oldest, part number).
    """

    serializer_class = InventorySerializer
    queryset = InventoryPart.objects.select_related("inventory__company", "part")
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]
    pagination_class = InventoryPartsPagination

    def _company_or_bad_request(self):
        """
        Platform admins pass IsCompanyMember without a DB company; avoid a silent [].
        """
        company = get_request_company(self.request)
        if company is not None:
            return company, None
        detail = (
            "No company context for inventory. Add a company to your user, or as staff/superuser "
            "pick a tenant (frontend sends X-Company-Id after you choose a company in Site Admin)."
        )
        return None, Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        _company, err = self._company_or_bad_request()
        if err is not None:
            return err
        qs = _apply_inventory_list_filters(request, self.filter_queryset(self.get_queryset()))
        summary = _inventory_list_summary(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["summary"] = summary
            return response
        serializer = self.get_serializer(qs, many=True)
        return Response({"results": serializer.data, "count": qs.count(), "summary": summary})

    def create(self, request, *args, **kwargs):
        _company, err = self._company_or_bad_request()
        if err is not None:
            return err
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        user_company = get_request_company(self.request)
        if not user_company:
            return InventoryPart.objects.none()
        tracked_count = (
            InstalledComponent.objects.filter(company_id=user_company.id)
            .filter(
                Q(part_id=OuterRef("part_id"))
                | Q(part_number=OuterRef("part__part_number"))
            )
            .values("part_id")
            .annotate(cnt=Count("id"))
            .values("cnt")[:1]
        )
        return (
            super()
            .get_queryset()
            .filter(inventory__company=user_company)
            .annotate(
                tracked_units_count=Coalesce(
                    Subquery(tracked_count, output_field=IntegerField()), 0
                )
            )
        )

    def perform_create(self, serializer):
        company = get_request_company(self.request)
        inv, _ = Inventory.objects.get_or_create(company=company)
        serializer.save(inventory=inv)


class CompanyLowStockInventoryListView(generics.ListAPIView):
    """
    Low-stock lines: same scope as list (all companies for admins, optionally filtered by header).
    """

    serializer_class = InventorySerializer
    queryset = InventoryPart.objects.select_related("inventory__company", "part")
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

    def get_queryset(self):
        return (
            inventory_parts_queryset_for_request(self.request).filter(
                quantity__lte=F("stock_alert")
            )
        )



@api_view(["GET"])
@permission_classes([IsMechanicOrManager])
def company_tools_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    tools = Tool.objects.filter(company=company).order_by("name")
    serializer = ToolSerializer(tools, many=True)
    return Response(serializer.data)


####
# ViewSets
####


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer

    def get_queryset(self):
        # Platform admins always see every tenant in Site Admin (ignore X-Company-Id).
        user = self.request.user
        if _is_platform_admin(user):
            return Company.objects.all().order_by("name")
        return company_scoped_company_queryset(self.request)

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [IsAuthenticated(), IsPlatformAdmin()]
        return [IsAuthenticated(), IsManagerOrOwner()]

    def perform_create(self, serializer):
        serializer.save()


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsOwnProfileOrManager]

    def get_queryset(self):
        return company_scoped_profile_queryset(self.request)

    def perform_create(self, serializer):
        company = get_request_company(self.request)
        if company is None and not _is_platform_admin(self.request.user):
            raise DRFValidationError({"detail": "No company context for new profile."})
        if company is not None:
            serializer.save(company=company)
        else:
            serializer.save()



class AircraftViewSet(viewsets.ModelViewSet):
    serializer_class = AircraftSerializer
    permission_classes = [IsManagerOrOwner]

    def get_queryset(self):
        return company_scoped_aircraft_queryset(self.request)

    def perform_create(self, serializer):
        company = get_request_company(self.request)
        if company is None and _is_platform_admin(getattr(self.request, "user", None)):
            company = serializer.validated_data.get("company")
        serializer.save(company=company)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def work_order_history(self, request, pk=None):
        aircraft = self.get_object()
        work_orders = WorkOrder.objects.filter(aircraft=aircraft).order_by("-created_at")
        serializer = WorkOrderSerializer(work_orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class PartViewSet(viewsets.ModelViewSet):
    serializer_class = PartSerializer

    def get_queryset(self):
        return company_scoped_part_queryset(self.request)

    def get_permissions(self):
        # Allow all authenticated company users to read parts for maintenance/work-order context.
        # Keep write operations restricted to mechanic/manager/owner via existing permission.
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsMechanicOrManager()]

    def perform_create(self, serializer):
        company = get_request_company(self.request)
        aircraft = serializer.validated_data.get("aircraft")
        if (
            aircraft is not None
            and company is not None
            and getattr(aircraft, "company_id", None) != company.id
        ):
            raise DRFValidationError(
                {"aircraft": "Aircraft must belong to your company."}
            )
        serializer.save()

class DiscrepancyViewSet(viewsets.ModelViewSet):
    serializer_class = DiscrepancySerializer

    def get_queryset(self):
        return company_scoped_discrepancy_queryset(self.request)

    def get_permissions(self):
        # Authenticated company users can create discrepancy reports; only owners delete in MVP.
        if self.action == "create":
            return [IsAuthenticated()]
        if self.action in {"update", "partial_update"}:
            return [IsAuthenticated()]
        if self.action == "destroy":
            return [IsOwner()]
        return [IsAuthenticated()]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        role = _request_role(request.user)
        is_admin = _is_platform_admin(request.user)
        can_operate = role in {"mechanic", "dispatcher", "manager", "owner"} or is_admin
        can_edit_own_report = role == "pilot" and instance.reporter_id == request.user.id
        if not (can_operate or can_edit_own_report):
            return Response(
                {"detail": "You do not have permission to edit this discrepancy."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsMechanicOrManager])
    def open_work_order(self, request, pk=None):
        discrepancy = self.get_object()
        before = snapshot_discrepancy(discrepancy)
        ata_raw = (discrepancy.ata_code or "").strip()
        try:
            ata_int = int(ata_raw)
        except (ValueError, TypeError):
            ata_int = None

        tach_raw = (str(discrepancy.tach_time) if discrepancy.tach_time else "").strip()
        try:
            from decimal import Decimal, InvalidOperation
            tach_val = Decimal(tach_raw) if tach_raw else None
        except (InvalidOperation, ValueError, TypeError):
            tach_val = None

        desc = (discrepancy.description or "").strip()
        first_line = desc.splitlines()[0].strip() if desc else ""
        if len(first_line) > 120:
            first_line = first_line[:117] + "..."
        wo_title = first_line or f"Discrepancy #{discrepancy.id}"

        work_order = WorkOrder.objects.create(
            aircraft=discrepancy.aircraft,
            title=wo_title,
            ATA_code=ata_int,
            tach_time=tach_val,
            description=discrepancy.description or "",
            status="open",
            created_by=request.user,
        )
        log_work_order_created(work_order, request)

        discrepancy.work_order = work_order
        discrepancy.save()
        after = snapshot_discrepancy(discrepancy)
        log_discrepancy_updated(discrepancy, before, after, request)

        serializer = WorkOrderSerializer(work_order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
            
    def perform_create(self, serializer):
        reporter = serializer.validated_data.get("reporter")
        if reporter is None:
            serializer.save(reporter=self.request.user)
            return
        serializer.save()

class WorkOrderViewSet(viewsets.ModelViewSet):
    serializer_class = WorkOrderSerializer

    def get_queryset(self):
        return company_scoped_workorder_queryset(self.request)

    def get_permissions(self):
        # Authenticated company users create; only owners delete in MVP.
        if self.action == "create":
            return [IsAuthenticated()]
        if self.action in {"update", "partial_update"}:
            return [IsAuthenticated()]
        if self.action == "destroy":
            return [IsOwner()]
        return [IsAuthenticated()]

    def update(self, request, *args, **kwargs):
        role = _request_role(request.user)
        if not (
            role in {"mechanic", "dispatcher", "manager", "owner"}
            or _is_platform_admin(request.user)
        ):
            return Response(
                {"detail": "You do not have permission to edit work orders."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        created_by = serializer.validated_data.get("created_by")
        if created_by is None:
            serializer.save(created_by=self.request.user)
            return
        serializer.save()

    @action(detail=True, methods=["post"], permission_classes=[CanSignWorkOrder])
    def close(self, request, pk=None):
        work_order = self.get_object()
        prev_status = work_order.status
        work_order.status = "closed"
        work_order.signed_by = request.user
        work_order.signature_date = date.today()
        work_order.completion_notes = request.data.get("completion_notes")
        work_order.save()

        from .models import LaborEntry

        raw_labor = request.data.get("labor_hours")
        if raw_labor not in (None, ""):
            try:
                hours = float(raw_labor)
                if hours > 0:
                    LaborEntry.objects.create(
                        work_order=work_order,
                        mechanic=request.user,
                        hours=round(hours, 2),
                        work_date=date.today(),
                        notes=(request.data.get("labor_notes") or "").strip()[:500],
                        created_by=request.user,
                    )
            except (TypeError, ValueError):
                pass

        notes = (work_order.completion_notes or "").strip()
        summary_parts = [f"Status {prev_status.replace('_', ' ').title()} → Closed", "Signed off"]
        if notes:
            summary_parts.append(f"Notes: {notes}")
        WorkOrderActivity.objects.create(
            work_order=work_order,
            actor=request.user,
            event_type=WorkOrderActivity.EventType.UPDATED,
            summary="; ".join(summary_parts),
            metadata={"closed_via": "sign_off", "completion_notes": notes},
        )

        affected_discrepancies = list(work_order.discrepancies.exclude(status="closed"))
        for disc in affected_discrepancies:
            before = snapshot_discrepancy(disc)
            disc.status = "closed"
            disc.save(update_fields=["status"])
            after = snapshot_discrepancy(disc)
            log_discrepancy_updated(disc, before, after, request)

        serializer = WorkOrderSerializer(work_order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.all().order_by("-departure_time")
    serializer_class = FlightSerializer
    permission_classes = [IsManagerOrOwner]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
        except ValidationError as e:
            return Response(e.message_dict, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InventoryViewSet(viewsets.ModelViewSet):
    """
    CRUD for inventory line items (InventoryPart). Tenants: company scope.
    Platform admins: full access; create requires X-Company-Id or `company` in body.
    """

    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

    def get_queryset(self):
        return inventory_parts_queryset_for_request(self.request)

    def perform_create(self, serializer):
        company = resolve_company_for_inventory_create(self.request)
        inv, _ = Inventory.objects.get_or_create(company=company)
        serializer.save(inventory=inv)


class ToolViewSet(viewsets.ModelViewSet):
    serializer_class = ToolSerializer
    permission_classes = [IsMechanicOrManager]

    def get_queryset(self):
        user_company = getattr(self.request.user, "company", None)
        if not user_company:
            return Tool.objects.none()
        return Tool.objects.filter(company=user_company).order_by("name")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=True, methods=["post"])
    def record_calibration(self, request, pk=None):
        tool = self.get_object()
        serializer = CalibrationRecordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        record = serializer.save(tool=tool)
        tool.calibration_due_date = record.next_due_date
        tool.save()
        return Response(CalibrationRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def calibration_history(self, request, pk=None):
        tool = self.get_object()
        records = tool.calibration_history.order_by("-calibration_date")
        serializer = CalibrationRecordSerializer(records, many=True)
        return Response(serializer.data)


class FleetAircraftListView(generics.ListAPIView):
    serializer_class = FleetAircraftListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = fleet_aircraft_queryset(self.request)
        params = self.request.query_params
        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(registration_number__icontains=search)
                | Q(model__icontains=search)
                | Q(location__icontains=search)
            )
        status_filter = params.get("status")
        if status_filter:
            qs = qs.filter(fleet_status=status_filter)
        aircraft_type = params.get("type")
        if aircraft_type:
            qs = qs.filter(aircraft_type=aircraft_type)
        location = params.get("location")
        if location:
            qs = qs.filter(location=location)
        ordering = params.get("ordering")
        allowed_ordering = {
            "registration_number",
            "model",
            "location",
            "fleet_status",
            "tach_current",
            "-registration_number",
            "-model",
            "-location",
            "-fleet_status",
            "-tach_current",
        }
        if ordering in allowed_ordering:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("registration_number")
        return qs


class FleetAircraftDetailView(generics.RetrieveAPIView):
    serializer_class = FleetAircraftDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "aircraft_id"

    def get_queryset(self):
        return fleet_aircraft_queryset(self.request).prefetch_related("photos")


class FleetAircraftIntervalListCreateView(generics.ListCreateAPIView):
    serializer_class = AircraftMaintenanceIntervalSerializer
    permission_classes = [IsAuthenticated]

    def get_aircraft(self):
        return get_object_or_404(
            fleet_aircraft_queryset(self.request), pk=self.kwargs["aircraft_id"]
        )

    def get_queryset(self):
        aircraft = self.get_aircraft()
        return AircraftMaintenanceInterval.objects.filter(aircraft=aircraft).order_by("name")

    def create(self, request, *args, **kwargs):
        role = getattr(request.user, "company_role", None)
        if not (
            role in {"mechanic", "dispatcher", "manager", "owner"}
            or _is_platform_admin(request.user)
        ):
            return Response(
                {"detail": "You do not have permission to create intervals."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(aircraft=self.get_aircraft())


class FleetAircraftIntervalUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AircraftMaintenanceIntervalSerializer
    permission_classes = [IsAuthenticated]
    queryset = AircraftMaintenanceInterval.objects.select_related("aircraft")
    lookup_url_kwarg = "interval_id"

    def update(self, request, *args, **kwargs):
        role = getattr(request.user, "company_role", None)
        if not (
            role in {"mechanic", "dispatcher", "manager", "owner"}
            or _is_platform_admin(request.user)
        ):
            return Response(
                {"detail": "You do not have permission to update intervals."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance = self.get_object()
        allowed_ids = set(
            fleet_aircraft_queryset(request).values_list("id", flat=True)
        )
        if instance.aircraft_id not in allowed_ids:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        role = getattr(request.user, "company_role", None)
        if not (
            role in {"owner"}
            or _is_platform_admin(request.user)
        ):
            return Response(
                {"detail": "You do not have permission to delete intervals."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance = self.get_object()
        allowed_ids = set(
            fleet_aircraft_queryset(request).values_list("id", flat=True)
        )
        if instance.aircraft_id not in allowed_ids:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return super().destroy(request, *args, **kwargs)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fleet_interval_complete_view(request, interval_id):
    role = getattr(request.user, "company_role", None)
    if not (
        role in {"mechanic", "dispatcher", "manager", "owner"}
        or _is_platform_admin(request.user)
    ):
        return Response(
            {"detail": "You do not have permission to complete intervals."},
            status=status.HTTP_403_FORBIDDEN,
        )
    interval = get_object_or_404(
        AircraftMaintenanceInterval.objects.select_related("aircraft"), pk=interval_id
    )
    allowed_ids = set(fleet_aircraft_queryset(request).values_list("id", flat=True))
    if interval.aircraft_id not in allowed_ids:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    completed_date = request.data.get("completed_date")
    completed_tach = request.data.get("completed_tach")
    completed_hobbs = request.data.get("completed_hobbs")
    notes = request.data.get("notes")
    if completed_date:
        parsed = parse_date(completed_date)
        if not parsed:
            return Response(
                {"detail": "completed_date must be YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        interval.last_done_date = parsed
    if completed_tach not in (None, ""):
        interval.last_done_tach = completed_tach
    if completed_hobbs not in (None, ""):
        interval.last_done_hobbs = completed_hobbs
    if notes is not None:
        interval.notes = str(notes)
    interval.save()
    serializer = AircraftMaintenanceIntervalSerializer(
        interval, context={"request": request}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)
