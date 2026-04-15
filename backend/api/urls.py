from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'profiles', ProfileViewSet, basename='profiles')
router.register(r'aircraft', AircraftViewSet, basename='aircraft')
router.register(r'parts', PartViewSet, basename='parts')
router.register(r'discrepancies', DiscrepancyViewSet, basename='discrepancies')
router.register(r'workorders', WorkOrderViewSet, basename='workorders')
router.register(r'flights', FlightViewSet, basename='flights')

urlpatterns = [
    path('health/', health, name='health'),
    path('auth/login/', login, name='login'),
    path('auth/token/refresh/', token_refresh, name='token_refresh'),
    path('auth/logout/', logout, name='logout'),
    path('users/me/', user_profile, name='user_profile'),
    path('company/aircraft/add_hobbs_time/', add_hobbs_time_view, name='add-hobbs-time'),
    path('aircraft/availability/', available_aircraft_view, name='aircraft-availability'),
    path('flights/calendar/', flight_list_view, name='flight-calendar'),
    path('management/dashboard/', management_dashboard_view, name='management-dashboard'),
    path('company/users/', company_user_view, name='company-users'),
    path('company/inventories/', company_inventory_view, name='company-inventory'),
    path('company/low_stock/', company_low_stock_view, name='company-low_stock'),
    path('company/aircrafts/', company_aircraft_view, name='company-aircraft'),
    path('company/flights/', company_flights_view, name='company-flights'),
    path('company/workorders/', company_workorders_view, name='company-workorders'),
    path('company/overdue_workorders/', company_overdue_workorders_view, name='company-overdue-workorders'),
    path('company/discrepancies/', company_discrepancies_view, name = "company-discrepancies"),
    path('company/role/', company_role_view, name = "company-role"),
    path('', include(router.urls)),
    
]

