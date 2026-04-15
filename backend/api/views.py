from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime, parse_date

from rest_framework import viewsets, permissions
from .models import *
from .serializers import *

from rest_framework import viewsets, permissions
from .models import (
    Company, Profile, Aircraft, Part,
    Discrepancy, WorkOrder
)
from .serializers import (
    CompanySerializer, ProfileSerializer, AircraftSerializer,
    PartSerializer, DiscrepancySerializer, WorkOrderSerializer
)

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return JsonResponse({'status': 'ok'})

@api_view(['POST'])
@permission_classes([AllowAny])
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
    Get current user profile
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
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
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    
    aircraft_id = request.GET.get('aircraft_id')#optional

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

    if aircraft_id:
        try:
            aircraft_id = int(aircraft_id)
        except ValueError:
            return Response({'error': 'aircraft_id must be an integer'}, status=400)
        available_aircraft = company.availability(start_date, end_date, aircraft_id=aircraft_id)
    else:
        available_aircraft = company.availability(start_date, end_date)

    serializer = AircraftSerializer(available_aircraft, many=True)
    return Response(serializer.data)

#Gets the flights for the calendar view, given start date and end date, and optionally an aircraft id, returns all the flights that fall within that date range.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def flight_list_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    aircraft_id = request.GET.get('aircraft_id')

    start_date = parse_date(start_date_str)
    end_date = parse_date(end_date_str)
    if not start_date or not end_date:
        return Response({'error': 'start_date and end_date are required'}, status=400)
    if start_date > end_date:
        return Response({'error': 'start_date must be before end_date'}, status=400)
    
    if aircraft_id:
        try:
            aircraft_id = int(aircraft_id)
        except ValueError:
            return Response({'error': 'aircraft_id must be an integer'}, status=400)
        flights = company.calendar_flights(start_date, end_date, aircraft_id=aircraft_id)
    else:
        flights = company.calendar_flights(start_date, end_date)
    
    serializer = FlightSerializer(flights, many=True)
    return Response(serializer.data)

#endpoint for the management dashboard.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def management_dashboard_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_management_dashboard_data()
    return Response(data)
###
#endpoints for all of the company submodels
###

#endpoint for company's users
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_user_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_user_data()
    return Response(data)

#endpoint for company's aircrafts
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_aircraft_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_aircraft_data()
    return Response(data)

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
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_flight_data()
    return Response(data)

#endpoint for company's inventories
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_inventory_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_inventory_data()
    return Response(data)

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
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_workorders_data()
    return Response(data)

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
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    data = company.get_discrepancy_data()
    return Response(data)

#endpoint that takes in the role that is wanted and checks the user in the company that is that role
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_role_view(request):
    company = request.user.company
    if company is None:
        return Response({'error': 'User does not have an associated company'}, status=403)
    role = request.GET.get("role")
    if not role:
        return Response({'error': 'Role parameter is required'}, status=400)
    valid_roles = [r[0] for r in Profile.role_choices]

    if role not in valid_roles:
        return Response({'error': 'Given role is not a valid role.'}, status=400)
    data = company.get_company_role_data(role)
    return Response(data)


####
# User Profile
####


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]


####
# Maintenance Dashboard
####


class AircraftViewSet(viewsets.ModelViewSet):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer
    permission_classes = [permissions.IsAuthenticated]

class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [permissions.IsAuthenticated]

class DiscrepancyViewSet(viewsets.ModelViewSet):
    queryset = Discrepancy.objects.all().order_by('-date_reported')
    serializer_class = DiscrepancySerializer
    permission_classes = [permissions.IsAuthenticated]

class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all().order_by('-created_at')
    serializer_class = WorkOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

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
