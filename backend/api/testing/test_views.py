import pytest
from datetime import timedelta

from django.utils import timezone
from django.urls import reverse
from rest_framework import status


@pytest.fixture
def owner_client(api_client, sample_profile):
    api_client.force_authenticate(user=sample_profile)
    return api_client


@pytest.mark.django_db
class TestPublicAuthViews:
    def test_health_returns_ok(self, api_client):
        url = reverse("health")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "ok"

    def test_login_success(self, api_client, sample_user):
        url = reverse("login")
        data = {"username": "testuser", "password": "testpass123"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_missing_fields(self, api_client):
        url = reverse("login")
        response = api_client.post(url, {"username": "only-user"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_invalid_credentials(self, api_client):
        url = reverse("login")
        data = {"username": "invalid", "password": "wrong"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh_success(self, api_client, sample_user):
        login_url = reverse("login")
        login_response = api_client.post(
            login_url,
            {"username": "testuser", "password": "testpass123"},
        )
        refresh = login_response.data["refresh"]

        refresh_url = reverse("token_refresh")
        response = api_client.post(refresh_url, {"refresh": refresh})

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_token_refresh_requires_token(self, api_client):
        url = reverse("token_refresh")
        response = api_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAuthenticatedUserViews:
    def test_user_profile_requires_auth(self, api_client):
        url = reverse("user_profile")
        response = api_client.get(url)

        assert response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }

    def test_user_profile_success(self, authenticated_client, sample_user):
        url = reverse("user_profile")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == sample_user.username
        assert response.data["company_role"] == sample_user.company_role
        assert "phone_number" in response.data

    def test_user_profile_patch_contact(self, authenticated_client, sample_user):
        url = reverse("user_profile")
        payload = {"first_name": "Pat", "phone_number": "5551234567", "middle_name": "Jay"}
        response = authenticated_client.patch(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Pat"
        assert response.data["phone_number"] == "5551234567"
        sample_user.refresh_from_db()
        assert sample_user.first_name == "Pat"
        assert sample_user.phone_number == "5551234567"

    def test_logout_requires_auth(self, api_client):
        url = reverse("logout")
        response = api_client.post(url, {})

        assert response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }

    def test_logout_authenticated(self, authenticated_client):
        url = reverse("logout")
        response = authenticated_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCompanyFunctionViews:
    def test_available_aircraft_requires_auth(self, api_client):
        url = reverse("aircraft-availability")
        response = api_client.get(url)

        assert response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }

    def test_available_aircraft_missing_dates(self, authenticated_client):
        url = reverse("aircraft-availability")
        # Keep this false so current server exceptions become response codes.
        authenticated_client.raise_request_exception = False
        response = authenticated_client.get(
            url,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_available_aircraft_success(self, authenticated_client, sample_flight):
        url = reverse("aircraft-availability")
        start_date = (timezone.now() + timedelta(days=5)).isoformat()
        end_date = (timezone.now() + timedelta(days=6)).isoformat()
        response = authenticated_client.get(
            url,
            {"start_date": start_date, "end_date": end_date},
        )

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_flight_calendar_requires_auth(self, api_client):
        url = reverse("flight-calendar")
        response = api_client.get(url)

        assert response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }

    def test_flight_calendar_missing_dates(self, authenticated_client):
        url = reverse("flight-calendar")
        # Keep this false so current server exceptions become response codes.
        authenticated_client.raise_request_exception = False
        response = authenticated_client.get(
            url,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_flight_calendar_success(self, authenticated_client, sample_flight):
        url = reverse("flight-calendar")
        today = timezone.now().date()
        # Keep this false so current server exceptions become response codes.
        authenticated_client.raise_request_exception = False
        response = authenticated_client.get(
            url,
            {
                "start_date": today.isoformat(),
                "end_date": (today + timedelta(days=10)).isoformat(),
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_management_dashboard_requires_manager_or_owner(
        self, authenticated_client
    ):
        url = reverse("management-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_management_dashboard_owner_success(self, owner_client):
        url = reverse("management-dashboard")
        response = owner_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "company_id" in response.data

    def test_fleet_availability_dashboard_requires_manager_or_owner(
        self, authenticated_client
    ):
        url = reverse("fleet-availability-dashboard")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_fleet_availability_dashboard_owner_success(
        self, owner_client, sample_aircraft
    ):
        url = reverse("fleet-availability-dashboard")
        response = owner_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "fleet" in data
        assert data["fleet"]["total_aircraft"] >= 1
        assert len(data["fleet"]["segments"]) == 3
        keys = {s["key"] for s in data["fleet"]["segments"]}
        assert keys == {"available", "in_maintenance", "grounded"}
        assert "open_work_orders_by_priority" in data
        assert "critical" in data["open_work_orders_by_priority"]
        assert "trends" in data

    def test_fleet_availability_maps_statuses_to_segments(
        self, owner_client, sample_company
    ):
        from api.models import Aircraft

        Aircraft.objects.create(
            registration_number="N111XX",
            model="Citation",
            manufacturer="Textron",
            engine_type="Jet",
            year_built=2010,
            company=sample_company,
            fleet_status="maintenance_due",
        )
        Aircraft.objects.create(
            registration_number="N222XX",
            model="King Air",
            manufacturer="Beech",
            engine_type="Turboprop",
            year_built=2005,
            company=sample_company,
            fleet_status="grounded",
        )
        Aircraft.objects.create(
            registration_number="N333XX",
            model="Citation",
            manufacturer="Textron",
            engine_type="Jet",
            year_built=2012,
            company=sample_company,
            fleet_status="aog",
        )

        url = reverse("fleet-availability-dashboard")
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        seg_map = {s["key"]: s["count"] for s in response.data["fleet"]["segments"]}
        assert seg_map["in_maintenance"] >= 1
        assert seg_map["grounded"] >= 2  # grounded + AOG bucket


    def test_company_users_success(self, authenticated_client, sample_user):
        url = reverse("company-users")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_inventory_success(self, authenticated_client, sample_inventory_part):
        url = reverse("company-inventory")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_aircraft_success(self, authenticated_client, sample_aircraft):
        url = reverse("company-aircraft")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_flights_success(self, authenticated_client, sample_flight):
        url = reverse("company-flights")
        # Keep this false so current server exceptions become response codes.
        authenticated_client.raise_request_exception = False
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_workorders_success(self, authenticated_client, sample_work_order):
        url = reverse("company-workorders")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_discrepancies_success(
        self, authenticated_client, sample_discrepancy
    ):
        url = reverse("company-discrepancies")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_role_requires_role_query(self, authenticated_client):
        url = reverse("company-role")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_company_role_success(self, authenticated_client):
        url = reverse("company-role")
        response = authenticated_client.get(url, {"role": "mechanic"})

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_company_inventory_detailed_success(
        self, authenticated_client, sample_inventory
    ):
        url = reverse("company_inventories_detailed")
        # Keep this false so current server exceptions become response codes.
        authenticated_client.raise_request_exception = False
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)


@pytest.mark.django_db
class TestViewSetEndpoints:
    def test_companies_list_owner_success(self, owner_client, sample_company):
        url = reverse("companies-list")
        response = owner_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_companies_list_mechanic_forbidden(self, authenticated_client):
        url = reverse("companies-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_profiles_list_authenticated(self, authenticated_client, sample_profile):
        url = reverse("profiles-list")
        # Keep this false so current server exceptions become response codes.
        authenticated_client.raise_request_exception = False
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_aircraft_list_owner_success(self, owner_client, sample_aircraft):
        url = reverse("aircraft-list")
        response = owner_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_aircraft_list_mechanic_forbidden(self, authenticated_client):
        url = reverse("aircraft-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_parts_list_mechanic_success(self, authenticated_client, sample_part):
        url = reverse("parts-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_discrepancies_list_mechanic_success(
        self, authenticated_client, sample_discrepancy
    ):
        url = reverse("discrepancies-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_workorders_list_mechanic_success(
        self, authenticated_client, sample_work_order
    ):
        url = reverse("workorders-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_flights_list_owner_success(self, owner_client, sample_flight):
        url = reverse("flights-list")
        # Keep this false so current server exceptions become response codes.
        owner_client.raise_request_exception = False
        response = owner_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_flights_list_mechanic_forbidden(self, authenticated_client):
        url = reverse("flights-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_inventories_list_mechanic_success(
        self, authenticated_client, sample_inventory
    ):
        url = reverse("inventories-list")
        # Keep this false so current server exceptions become response codes.
        authenticated_client.raise_request_exception = False
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)


@pytest.mark.django_db
class TestFleetEndpoints:
    def test_fleet_aircraft_list_success(self, authenticated_client, sample_aircraft):
        url = reverse("fleet-aircraft-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_fleet_aircraft_detail_success(self, authenticated_client, sample_aircraft):
        url = reverse("fleet-aircraft-detail", kwargs={"aircraft_id": sample_aircraft.id})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == sample_aircraft.id
        assert "links" in response.data

    def test_fleet_intervals_list_success(
        self, authenticated_client, sample_aircraft, sample_maintenance_interval
    ):
        url = reverse("fleet-aircraft-intervals", kwargs={"aircraft_id": sample_aircraft.id})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert "compliance_status" in response.data[0]

    def test_fleet_intervals_create_mechanic_success(self, authenticated_client, sample_aircraft):
        url = reverse("fleet-aircraft-intervals", kwargs={"aircraft_id": sample_aircraft.id})
        payload = {
            "name": "Annual",
            "interval_type": "days",
            "due_every_days": 365,
            "last_done_date": timezone.now().date().isoformat(),
        }
        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Annual"

    def test_fleet_intervals_create_pilot_forbidden(
        self, api_client, sample_company, sample_aircraft, django_user_model
    ):
        pilot = django_user_model.objects.create_user(
            username="fleet.pilot",
            email="fleet.pilot@example.com",
            password="pass12345",
            company=sample_company,
            company_role="pilot",
        )
        api_client.force_authenticate(user=pilot)
        url = reverse("fleet-aircraft-intervals", kwargs={"aircraft_id": sample_aircraft.id})
        response = api_client.post(url, {"name": "Pilot Add"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_fleet_interval_complete_success(
        self, authenticated_client, sample_maintenance_interval
    ):
        url = reverse(
            "fleet-interval-complete",
            kwargs={"interval_id": sample_maintenance_interval.id},
        )
        payload = {
            "completed_date": timezone.now().date().isoformat(),
            "completed_tach": 1500.0,
            "notes": "Completed in test",
        }
        response = authenticated_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["last_done_tach"] == "1500.0"


@pytest.mark.django_db
class TestOwnershipRbacRules:
    def test_pilot_can_edit_own_discrepancy(
        self, api_client, sample_company, sample_aircraft, sample_pilot_profile
    ):
        from api.models import Discrepancy

        discrepancy = Discrepancy.objects.create(
            aircraft=sample_aircraft,
            reporter=sample_pilot_profile,
            description="Initial pilot report",
            ata_code="24",
            tach_time="1200.1",
            status="pending",
        )
        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("discrepancies-detail", kwargs={"pk": discrepancy.id})
        response = api_client.patch(
            url,
            {"description": "Updated by reporting pilot"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Updated by reporting pilot"

    def test_pilot_cannot_edit_other_users_discrepancy(
        self, api_client, sample_discrepancy, sample_pilot_profile
    ):
        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("discrepancies-detail", kwargs={"pk": sample_discrepancy.id})
        response = api_client.patch(
            url,
            {"description": "Attempted unauthorized pilot edit"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_pilot_can_edit_own_flight_request_but_not_status(
        self, api_client, sample_flight, sample_pilot_profile
    ):
        sample_flight.primary_pilot = sample_pilot_profile
        sample_flight.status = "pending approval"
        sample_flight.save(update_fields=["primary_pilot", "status"])

        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("company-flight-dispatch", kwargs={"pk": sample_flight.id})

        ok = api_client.patch(url, {"route": "UPDATED-ROUTE"}, format="json")
        deny = api_client.patch(url, {"status": "approved"}, format="json")

        assert ok.status_code == status.HTTP_200_OK
        assert ok.data["route"] == "UPDATED-ROUTE"
        assert deny.status_code == status.HTTP_403_FORBIDDEN

    def test_pilot_cannot_edit_other_users_flight_request(
        self, api_client, sample_flight, sample_pilot_profile
    ):
        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("company-flight-dispatch", kwargs={"pk": sample_flight.id})
        response = api_client.patch(url, {"route": "SHOULD-NOT-WORK"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestServiceHistoryViews:
    def test_mechanic_can_list_service_history(
        self, authenticated_client, sample_work_order
    ):
        url = reverse("service-history-work-orders")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1
        assert any(r["id"] == sample_work_order.id for r in response.data["results"])

    def test_pilot_cannot_access_service_history(self, api_client, sample_pilot_profile):
        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("service-history-work-orders")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_filter_by_ata(self, authenticated_client, sample_work_order):
        sample_work_order.ATA_code = 32
        sample_work_order.save(update_fields=["ATA_code"])
        url = reverse("service-history-work-orders")
        response = authenticated_client.get(url, {"ata": 32})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["ATA_code"] == 32

    def test_work_order_detail(self, authenticated_client, sample_work_order):
        url = reverse(
            "service-history-work-order-detail", kwargs={"pk": sample_work_order.id}
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == sample_work_order.id
        assert response.data["labor_hours_total"] is None
        assert "activities" in response.data

    def test_pagination(self, authenticated_client, sample_aircraft, sample_user):
        from api.models import WorkOrder

        for i in range(3):
            WorkOrder.objects.create(
                aircraft=sample_aircraft,
                created_by=sample_user,
                title=f"WO {i}",
                status="closed",
            )
        url = reverse("service-history-work-orders")
        response = authenticated_client.get(url, {"page_size": 2, "page": 1})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 3
        assert len(response.data["results"]) == 2


@pytest.mark.django_db
class TestGlobalSearch:
    def test_requires_authentication(self, api_client):
        url = reverse("global-search")
        response = api_client.get(url, {"q": "N123"})
        assert response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }

    def test_short_query_returns_empty_groups(self, owner_client):
        url = reverse("global-search")
        response = owner_client.get(url, {"q": "N"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["groups"] == []

    def test_owner_finds_aircraft_and_work_order(
        self, owner_client, sample_aircraft, sample_work_order
    ):
        url = reverse("global-search")
        ac_resp = owner_client.get(url, {"q": sample_aircraft.registration_number[:5]})
        assert ac_resp.status_code == status.HTTP_200_OK
        keys = {g["key"] for g in ac_resp.data["groups"]}
        assert "aircraft" in keys

        wo_resp = owner_client.get(url, {"q": sample_work_order.title[:4]})
        assert wo_resp.status_code == status.HTTP_200_OK
        wo_keys = {g["key"] for g in wo_resp.data["groups"]}
        assert "work_orders" in wo_keys

    def test_pilot_sees_flights_not_work_orders(
        self, api_client, sample_pilot_profile, sample_flight
    ):
        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("global-search")
        response = api_client.get(
            url, {"q": (sample_flight.flight_number or "flight")[:4]}
        )
        assert response.status_code == status.HTTP_200_OK
        keys = {g["key"] for g in response.data["groups"]}
        assert "flights" in keys or response.data["groups"] == []
        assert "work_orders" not in keys
        assert "aircraft" not in keys

    def test_pilot_discrepancy_search_scoped_to_reporter(
        self, api_client, sample_pilot_profile, sample_discrepancy, sample_user, sample_aircraft
    ):
        from api.models import Discrepancy

        other = Discrepancy.objects.create(
            aircraft=sample_aircraft,
            reporter=sample_user,
            description="Other pilot squawk",
            status="pending",
        )
        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("global-search")
        response = api_client.get(url, {"q": "squawk"})
        assert response.status_code == status.HTTP_200_OK
        disc_group = next(
            (g for g in response.data["groups"] if g["key"] == "discrepancies"), None
        )
        if disc_group:
            titles = " ".join(i["title"] for i in disc_group["items"])
            assert "Other pilot" not in titles
