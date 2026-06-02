from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .labor_views import work_order_labor_entries, work_order_labor_entry_detail
from .component_history_views import (
    component_history_detail,
    component_history_event_update,
    component_history_export,
    component_history_list,
)
from .history_views import (
    service_history_work_order_detail,
    service_history_work_orders_list,
)
from .search_views import global_search_view
from .analytics_views import (
    fleet_performance_analytics_view,
    maintenance_analytics_view,
)
from .views import (
    health,
    login,
    token_refresh,
    logout,
    user_profile,
    admin_reset_password,
    change_own_password,
    available_aircraft_view,
    flight_list_view,
    management_dashboard_view,
    fleet_availability_dashboard_view,
    company_user_view,
    company_inventory_view,
    company_aircraft_view,
    company_flights_view,
    company_flight_request_view,
    company_flight_dispatch_view,
    company_workorders_view,
    company_discrepancies_view,
    company_role_view,
    FleetAircraftListView,
    FleetAircraftDetailView,
    FleetAircraftIntervalListCreateView,
    FleetAircraftIntervalUpdateView,
    fleet_interval_complete_view,
    CompanyViewSet,
    ProfileViewSet,
    AircraftViewSet,
    PartViewSet,
    DiscrepancyViewSet,
    WorkOrderViewSet,
    FlightViewSet,
    InventoryViewSet,
    CompanyInventoryListView,
    CompanyLowStockInventoryListView,
    maintenance_dashboard_view,
    ToolViewSet,
    company_tools_view,
)


router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="companies")
router.register(r"profiles", ProfileViewSet, basename="profiles")
router.register(r"aircraft", AircraftViewSet, basename="aircraft")
router.register(r"parts", PartViewSet, basename="parts")
router.register(r"discrepancies", DiscrepancyViewSet, basename="discrepancies")
router.register(r"workorders", WorkOrderViewSet, basename="workorders")
router.register(r"flights", FlightViewSet, basename="flights")
router.register(r"inventories", InventoryViewSet, basename="inventories")
router.register(r"tools", ToolViewSet, basename="tools")


urlpatterns = [
    path("health/", health, name="health"),
    path("auth/login/", login, name="login"),
    path("auth/token/refresh/", token_refresh, name="token_refresh"),
    path("auth/logout/", logout, name="logout"),
    path("users/me/", user_profile, name="user_profile"),
    path("users/me/change-password/", change_own_password, name="change_own_password"),
    path("profiles/<int:pk>/reset-password/", admin_reset_password, name="admin_reset_password"),
    path(
        "aircraft/availability/",
        available_aircraft_view,
        name="aircraft-availability",
    ),
    path(
        "flights/calendar/",
        flight_list_view,
        name="flight-calendar",
    ),
    path(
        "management/dashboard/",
        management_dashboard_view,
        name="management-dashboard",
    ),
    path(
        "dashboard/fleet-availability/",
        fleet_availability_dashboard_view,
        name="fleet-availability-dashboard",
    ),
    path("company/users/", company_user_view, name="company-users"),
    path("company/inventories/", company_inventory_view, name="company-inventory"),
    path("company/aircrafts/", company_aircraft_view, name="company-aircraft"),
    path("company/flights/", company_flights_view, name="company-flights"),
    path(
        "company/flights/request/",
        company_flight_request_view,
        name="company-flight-request",
    ),
    path(
        "company/flights/<int:pk>/dispatch/",
        company_flight_dispatch_view,
        name="company-flight-dispatch",
    ),
    path("company/workorders/", company_workorders_view, name="company-workorders"),
    path(
        "company/discrepancies/",
        company_discrepancies_view,
        name="company-discrepancies",
    ),
    path("company/role/", company_role_view, name="company-role"),
    path("company/tools/", company_tools_view, name="company-tools"),
    path("fleet/aircraft/", FleetAircraftListView.as_view(), name="fleet-aircraft-list"),
    path(
        "fleet/aircraft/<int:aircraft_id>/",
        FleetAircraftDetailView.as_view(),
        name="fleet-aircraft-detail",
    ),
    path(
        "fleet/aircraft/<int:aircraft_id>/intervals/",
        FleetAircraftIntervalListCreateView.as_view(),
        name="fleet-aircraft-intervals",
    ),
    path(
        "fleet/intervals/<int:interval_id>/",
        FleetAircraftIntervalUpdateView.as_view(),
        name="fleet-interval-update",
    ),
    path(
        "fleet/intervals/<int:interval_id>/complete/",
        fleet_interval_complete_view,
        name="fleet-interval-complete",
    ),
    # RBAC + serializer-based inventory endpoints (new)
    path(
        "company/inventories/detailed/",
        CompanyInventoryListView.as_view(),
        name="company_inventories_detailed",
    ),
    path(
        "company/inventories/detailed/low-stock/",
        CompanyLowStockInventoryListView.as_view(),
        name="company_low_stock_inventories_detailed",
    ),
    path("", include(router.urls)),
    path("maintenance/dashboard/", maintenance_dashboard_view, name="maintenance-dashboard"),
    path(
        "history/work-orders/",
        service_history_work_orders_list,
        name="service-history-work-orders",
    ),
    path(
        "history/work-orders/<int:pk>/",
        service_history_work_order_detail,
        name="service-history-work-order-detail",
    ),
    path(
        "history/components/",
        component_history_list,
        name="component-history-list",
    ),
    path(
        "history/components/<int:pk>/",
        component_history_detail,
        name="component-history-detail",
    ),
    path(
        "history/components/<int:pk>/export/",
        component_history_export,
        name="component-history-export",
    ),
    path(
        "history/components/<int:pk>/events/<int:event_id>/",
        component_history_event_update,
        name="component-history-event-update",
    ),
    path(
        "workorders/<int:work_order_pk>/labor-entries/",
        work_order_labor_entries,
        name="work-order-labor-entries",
    ),
    path(
        "workorders/<int:work_order_pk>/labor-entries/<int:entry_pk>/",
        work_order_labor_entry_detail,
        name="work-order-labor-entry-detail",
    ),
    path("search/", global_search_view, name="global-search"),
    path(
        "analytics/maintenance/",
        maintenance_analytics_view,
        name="analytics-maintenance",
    ),
    path(
        "analytics/fleet-performance/",
        fleet_performance_analytics_view,
        name="analytics-fleet-performance",
    ),
]

