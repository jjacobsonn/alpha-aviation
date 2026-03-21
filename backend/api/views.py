from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response

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


####
# User Profile
####


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwner()]
        return [IsAuthenticated()]


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsOwner()]
        if self.action in ['list', 'create']:
            return [IsManagerOrOwner()]
        # retrieve, update, partial_update — own profile or manager
        return [IsOwnProfileOrManager()]


####
# Maintenance Dashboard
####


class AircraftViewSet(viewsets.ModelViewSet):
    serializer_class = AircraftSerializer

    def get_queryset(self):
        has_open_work_orders = WorkOrder.objects.filter(
            aircraft=OuterRef('pk'),
            status__in=['open', 'in_progress', 'awaiting_parts'],
        )
        has_pending_discrepancies = Discrepancy.objects.filter(
            aircraft=OuterRef('pk'),
            status='pending',
        )
        return Aircraft.objects.annotate(
            is_ready_to_fly=Case(
                When(
                    Exists(has_open_work_orders) | Exists(has_pending_discrepancies),
                    then=Value(False),
                ),
                default=Value(True),
                output_field=BooleanField(),
            )
        ).order_by('-is_ready_to_fly', 'id')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrOwner()]
        return [IsAuthenticated()]


class PartViewSet(viewsets.ModelViewSet):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [IsMechanicOrManager]


class DiscrepancyViewSet(viewsets.ModelViewSet):
    queryset = Discrepancy.objects.all().order_by('-date_reported')
    serializer_class = DiscrepancySerializer

    def get_permissions(self):
        if self.action in ['create', 'list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsMechanicOrManager()]


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all().order_by('-created_at')
    serializer_class = WorkOrderSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsManagerOrOwner()]
        return [IsMechanicOrManager()]

class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.all()
    serializer_class = FlightSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrOwner()]
        return [IsAuthenticated()]

