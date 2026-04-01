from django.db.models import Count, F
from django.http import JsonResponse
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Aircraft,
    Company,
    Discrepancy,
    Flight,
    Inventory,
    InventoryPart,
    Part,
    Profile,
    WorkOrder,
)
from .permissions import (
    HasCompanyRole,
    IsCompanyMember,
    IsManagerOrOwner,
    IsMechanicOrManager,
    IsOwnProfileOrManager,
)
from .serializers import (
    AircraftSerializer,
    CompanySerializer,
    DiscrepancySerializer,
    FlightSerializer,
    InventorySerializer,
    PartSerializer,
    ProfileSerializer,
    WorkOrderSerializer,
)

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


def company_scoped_workorder_queryset(request):
    qs = (
        WorkOrder.objects.select_related("aircraft", "created_by", "signed_by")
        .prefetch_related("parts_needed")
        .order_by("-created_at")
    )
    aircraft_qs = company_scoped_aircraft_queryset(request).values_list("id", flat=True)
    return qs.filter(aircraft_id__in=aircraft_qs)


def company_scoped_discrepancy_queryset(request):
    qs = Discrepancy.objects.select_related("aircraft", "reporter", "work_order").order_by(
        "-date_reported"
    )
    aircraft_qs = company_scoped_aircraft_queryset(request).values_list("id", flat=True)
    return qs.filter(aircraft_id__in=aircraft_qs)


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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get current authenticated user profile, including role and company info.
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'company_role': getattr(user, 'company_role', None),
        'is_staff': bool(getattr(user, 'is_staff', False)),
        'is_superuser': bool(getattr(user, 'is_superuser', False)),
        'company': getattr(user.company, 'id', None) if getattr(user, 'company', None) else None,
        'company_name': getattr(user.company, 'name', None) if getattr(user, 'company', None) else None,
    })

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

    start_date = parse_datetime(start_date_str)
    end_date = parse_datetime(end_date_str)


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

    start_date = parse_date(start_date_str)
    end_date = parse_date(end_date_str)
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
    """
    Summary for owner/manager (and platform admins with X-Company-Id).
    Aligns with docs/RBAC_Plan.md: operational snapshot + team composition by role.
    """
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)

    aircraft_count = Aircraft.objects.filter(company=company).count()
    flights_count = Flight.objects.filter(company=company).count()
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

#endpoint for company's flights
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_flights_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    flights = (
        Flight.objects.filter(company=company)
        .select_related("aircraft", "primary_pilot", "secondary_pilot")
        .order_by("-departure_time")
    )
    serializer = FlightSerializer(flights, many=True)
    return Response(serializer.data)

#endpoint for company's inventories
@api_view(['GET'])
@permission_classes([IsMechanicOrManager])
def company_inventory_view(request):
    inventories = inventory_parts_queryset_for_request(request)
    serializer = InventorySerializer(inventories, many=True)
    return Response(serializer.data)

#endpoint for company's workorders
@api_view(['GET'])
@permission_classes([IsMechanicOrManager])
def company_workorders_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    workorders = (
        WorkOrder.objects.select_related("aircraft", "created_by", "signed_by")
        .prefetch_related("parts_needed")
        .filter(aircraft__company=company)
        .order_by("-created_at")
    )
    serializer = WorkOrderSerializer(workorders, many=True)
    return Response(serializer.data)

#endpoint for company's discrepancies
@api_view(['GET'])
@permission_classes([IsMechanicOrManager])
def company_discrepancies_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    discrepancies = (
        Discrepancy.objects.select_related("aircraft", "reporter", "work_order")
        .filter(aircraft__company=company)
        .order_by("-date_reported")
    )
    serializer = DiscrepancySerializer(discrepancies, many=True)
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


class CompanyInventoryListView(generics.ListCreateAPIView):
    """
    List and create inventory records for the authenticated user's company.
    """

    serializer_class = InventorySerializer
    queryset = InventoryPart.objects.select_related("inventory__company", "part")
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

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
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        _company, err = self._company_or_bad_request()
        if err is not None:
            return err
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        user_company = get_request_company(self.request)
        if not user_company:
            return InventoryPart.objects.none()
        return (
            super()
            .get_queryset()
            .filter(inventory__company=user_company)
            .order_by("part__part_number")
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



####
# ViewSets
####


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsManagerOrOwner]

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsOwnProfileOrManager]



class AircraftViewSet(viewsets.ModelViewSet):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer
    permission_classes = [IsManagerOrOwner]

class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [IsMechanicOrManager]

class DiscrepancyViewSet(viewsets.ModelViewSet):
    serializer_class = DiscrepancySerializer

    def get_queryset(self):
        return company_scoped_discrepancy_queryset(self.request)

    def get_permissions(self):
        # Anyone authenticated can create; mechanics/managers/owners manage.
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsMechanicOrManager()]

    def perform_create(self, serializer):
        reporter = serializer.validated_data.get("reporter")
        if reporter is None:
            serializer.save(reporter=self.request.user)
            return
        serializer.save()

class WorkOrderViewSet(viewsets.ModelViewSet):
    serializer_class = WorkOrderSerializer
    permission_classes = [IsMechanicOrManager]

    def get_queryset(self):
        return company_scoped_workorder_queryset(self.request)

    def perform_create(self, serializer):
        created_by = serializer.validated_data.get("created_by")
        if created_by is None:
            serializer.save(created_by=self.request.user)
            return
        serializer.save()


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
