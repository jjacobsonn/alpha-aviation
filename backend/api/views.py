from django.http import JsonResponse
from django.contrib.auth import authenticate
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status, generics, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime, parse_date

from rest_framework import viewsets, permissions
from .models import *
from .serializers import *

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .models import (
    Company,
    Profile,
    Aircraft,
    Part,
    Discrepancy,
    WorkOrder,
    Flight,
    Inventory,
)
from .permissions import (
    IsCompanyMember,
    HasCompanyRole,
    IsOwner,
    IsManagerOrOwner,
    IsMechanicOrManager,
    IsOwnProfileOrManager,
)
from .serializers import (
    CompanySerializer,
    ProfileSerializer,
    AircraftSerializer,
    PartSerializer,
    DiscrepancySerializer,
    WorkOrderSerializer,
    FlightSerializer,
    InventorySerializer,
)

from rest_framework import viewsets, permissions
from django.db.models import BooleanField, Case, When, Value, Exists, OuterRef
from .models import (
    Company, Profile, Aircraft, Part,
    Discrepancy, WorkOrder, Flight
)
from .permissions import IsMechanicOrManager, IsManagerOrOwner, IsOwner, IsOwnProfileOrManager
from .serializers import (
    CompanySerializer, ProfileSerializer, AircraftSerializer,
    PartSerializer, DiscrepancySerializer, WorkOrderSerializer, FlightSerializer
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
@permission_classes([IsAuthenticated])
def management_dashboard_view(request):
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    return Response({"company_id": company.id, "company_name": company.name})
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
    company = get_request_company(request)
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    inventories = (
        Inventory.objects.filter(company=company)
        .select_related("part")
        .order_by("part__part_number")
    )
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
    queryset = Inventory.objects.select_related("company", "part")
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

    def get_queryset(self):
        user_company = get_request_company(self.request)
        if not user_company:
            return Inventory.objects.none()
        return (
            super()
            .get_queryset()
            .filter(company=user_company)
            .order_by("part__part_number")
        )

    def perform_create(self, serializer):
        serializer.save(company=get_request_company(self.request))


class CompanyLowStockInventoryListView(generics.ListAPIView):
    """
    Return low-stock inventory items for the authenticated user's company.
    """

    serializer_class = InventorySerializer
    queryset = Inventory.objects.select_related("company", "part")
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

    def get_queryset(self):
        user_company = get_request_company(self.request)
        if not user_company:
            return Inventory.objects.none()

        base_qs = (
            super()
            .get_queryset()
            .filter(company=user_company)
            .order_by("part__part_number")
        )

        # low_stock is a method, so filter in Python for now.
        return [inv for inv in base_qs if inv.low_stock()]



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
    queryset = Discrepancy.objects.all().order_by("-date_reported")
    serializer_class = DiscrepancySerializer

    def get_permissions(self):
        # Anyone authenticated can create; mechanics/managers/owners manage.
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsMechanicOrManager()]

class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all().order_by("-created_at")
    serializer_class = WorkOrderSerializer
    permission_classes = [IsMechanicOrManager]


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.all().order_by("-departure_time")
    serializer_class = FlightSerializer
    permission_classes = [IsManagerOrOwner]


class InventoryViewSet(viewsets.ModelViewSet):
    """
    CRUD for Inventory records, scoped to the authenticated user's company.
    Used by the frontend for edit/delete operations.
    """

    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

    def get_queryset(self):
        user_company = get_request_company(self.request)
        if not user_company:
            return Inventory.objects.none()
        return Inventory.objects.select_related("company", "part").filter(
            company=user_company
        )

    def perform_create(self, serializer):
        serializer.save(company=get_request_company(self.request))

class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.all().order_by('-departure_time')
    serializer_class = FlightSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_create(serializer)
        except ValidationError as e:
            return Response(e.message_dict, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
