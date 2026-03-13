from django.http import JsonResponse
from django.contrib.auth import authenticate
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status, generics, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

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
        'company': getattr(user.company, 'id', None) if getattr(user, 'company', None) else None,
        'company_name': getattr(user.company, 'name', None) if getattr(user, 'company', None) else None,
    })


class CompanyInventoryListView(generics.ListCreateAPIView):
    """
    List and create inventory records for the authenticated user's company.
    """

    serializer_class = InventorySerializer
    queryset = Inventory.objects.select_related("company", "part")
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

    def get_queryset(self):
        user_company = getattr(self.request.user, "company", None)
        if not user_company:
            return Inventory.objects.none()
        return (
            super()
            .get_queryset()
            .filter(company=user_company)
            .order_by("part__part_number")
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class CompanyLowStockInventoryListView(generics.ListAPIView):
    """
    Return low-stock inventory items for the authenticated user's company.
    """

    serializer_class = InventorySerializer
    queryset = Inventory.objects.select_related("company", "part")
    permission_classes = [IsAuthenticated, IsCompanyMember, HasCompanyRole]
    allowed_roles = ["owner", "manager", "mechanic"]

    def get_queryset(self):
        user_company = getattr(self.request.user, "company", None)
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
# Company & Scheduling endpoints (from dev-kb)
####


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_aircraft_view(request):
    """
    Given start and end datetime, return aircraft available in that range.
    Optional: ?aircraft_id=<id> to check a specific aircraft.
    """
    start_date_str = request.GET.get("start_date")
    end_date_str = request.GET.get("end_date")
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )

    aircraft_id = request.GET.get("aircraft_id")  # optional

    start_date = parse_datetime(start_date_str)
    end_date = parse_datetime(end_date_str)

    if start_date and timezone.is_naive(start_date):
        start_date = timezone.make_aware(
            start_date, timezone.get_current_timezone()
        )
    if end_date and timezone.is_naive(end_date):
        end_date = timezone.make_aware(end_date, timezone.get_current_timezone())

    if not start_date or not end_date:
        return Response(
            {"error": "start_date and end_date are required"}, status=400
        )
    if start_date > end_date:
        return Response(
            {"error": "start_date must be before end_date"}, status=400
        )

    if aircraft_id:
        try:
            aircraft_id = int(aircraft_id)
        except ValueError:
            return Response(
                {"error": "aircraft_id must be an integer"}, status=400
            )
        available_aircraft = company.availability(
            start_date, end_date, aircraft_id=aircraft_id
        )
    else:
        available_aircraft = company.availability(start_date, end_date)

    serializer = AircraftSerializer(available_aircraft, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def flight_list_view(request):
    """
    Get flights for calendar view given start_date and end_date (dates),
    optional ?aircraft_id=<id>.
    """
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )

    start_date_str = request.GET.get("start_date")
    end_date_str = request.GET.get("end_date")
    aircraft_id = request.GET.get("aircraft_id")

    start_date = parse_date(start_date_str)
    end_date = parse_date(end_date_str)
    if not start_date or not end_date:
        return Response(
            {"error": "start_date and end_date are required"}, status=400
        )
    if start_date > end_date:
        return Response(
            {"error": "start_date must be before end_date"}, status=400
        )

    if aircraft_id:
        try:
            aircraft_id = int(aircraft_id)
        except ValueError:
            return Response(
                {"error": "aircraft_id must be an integer"}, status=400
            )
        flights = company.calendar_flights(
            start_date, end_date, aircraft_id=aircraft_id
        )
    else:
        flights = company.calendar_flights(start_date, end_date)

    serializer = FlightSerializer(flights, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsManagerOrOwner])
def management_dashboard_view(request):
    """
    Management dashboard summary for the authenticated user's company.
    """
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    data = company.get_management_dashboard_data()
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_user_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    data = company.get_user_data()
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_aircraft_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    data = company.get_aircraft_data()
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_flights_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    data = company.get_flight_data()
    return Response(data)


@api_view(["GET"])
@permission_classes([IsMechanicOrManager])
def company_inventory_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    data = company.get_inventory_data()
    return Response(data)


@api_view(["GET"])
@permission_classes([IsMechanicOrManager])
def company_workorders_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    data = company.get_workorders_data()
    return Response(data)


@api_view(["GET"])
@permission_classes([IsMechanicOrManager])
def company_discrepancies_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    data = company.get_discrepancy_data()
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_role_view(request):
    company = request.user.company
    if company is None:
        return Response(
            {"error": "User does not have an associated company"}, status=403
        )
    role = request.GET.get("role")
    if not role:
        return Response({"error": "Role parameter is required"}, status=400)

    valid_roles = [r[0] for r in Profile.role_choices]
    if role not in valid_roles:
        return Response(
            {"error": "Given role is not a valid role."}, status=400
        )

    data = company.get_company_role_data(role)
    return Response(data)


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
        user_company = getattr(self.request.user, "company", None)
        if not user_company:
            return Inventory.objects.none()
        return Inventory.objects.select_related("company", "part").filter(
            company=user_company
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

