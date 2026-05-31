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

    def test_logout_authenticated(self, api_client, sample_user):
        """Matches frontend: POST /auth/logout/ with refresh token in body."""
        login_response = api_client.post(
            reverse("login"),
            {"username": "testuser", "password": "testpass123"},
        )
        refresh = login_response.data["refresh"]
        access = login_response.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        url = reverse("logout")
        response = api_client.post(url, {"refresh": refresh}, format="json")
        assert response.status_code == status.HTTP_200_OK

        refresh_response = api_client.post(
            reverse("token_refresh"),
            {"refresh": refresh},
            format="json",
        )
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED


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
        assert "id" in response.data["company"]

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
        ids = [row["id"] for row in response.data]
        assert ids == [sample_company.id]

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
        self, api_client, sample_flight, sample_pilot_profile_secondary
    ):
        api_client.force_authenticate(user=sample_pilot_profile_secondary)
        url = reverse("company-flight-dispatch", kwargs={"pk": sample_flight.id})
        response = api_client.patch(url, {"route": "SHOULD-NOT-WORK"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestFlightActivityLog:
    def test_pilot_flight_edit_records_actor_name(
        self,
        api_client,
        sample_company,
        sample_aircraft,
        sample_pilot_profile,
        sample_pilot_profile_secondary,
        sample_pilot,
        sample_work_order,
    ):
        from api.models import Flight, FlightActivity

        sample_work_order.status = "open"
        sample_work_order.save(update_fields=["status"])

        departure = timezone.now() + timedelta(days=3)
        arrival = departure + timedelta(hours=2)
        flight = Flight.objects.create(
            company=sample_company,
            aircraft=sample_aircraft,
            origin="AAA",
            destination="BBB",
            departure_time=departure,
            arrival_time=arrival,
            primary_pilot=sample_pilot_profile,
            status="pending approval",
        )

        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("company-flight-dispatch", kwargs={"pk": flight.id})
        response = api_client.patch(
            url,
            {"route": "KBFI-KPAE direct"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data.get("activities") or []) >= 1
        latest = response.data["activities"][0]
        assert latest["actor_display"] == "Pilot User"
        assert "Route" in latest["summary"]

        db_latest = FlightActivity.objects.filter(flight=flight).first()
        assert db_latest is not None
        assert db_latest.actor_id == sample_pilot_profile.id


@pytest.mark.django_db
class TestCompanyFlightRequest:
    def test_pilot_can_submit_request_when_aircraft_has_open_work_order(
        self,
        api_client,
        sample_aircraft,
        sample_pilot_profile,
        sample_pilot,
        sample_work_order,
    ):
        """Pending requests must not be blocked by demo maintenance work orders."""
        sample_work_order.status = "open"
        sample_work_order.save(update_fields=["status"])

        api_client.force_authenticate(user=sample_pilot_profile)
        departure = timezone.now() + timedelta(days=2)
        arrival = departure + timedelta(hours=2)
        url = reverse("company-flight-request")
        response = api_client.post(
            url,
            {
                "aircraft": sample_aircraft.id,
                "origin": "KBFI",
                "destination": "KPAE",
                "departure_time": departure.isoformat(),
                "arrival_time": arrival.isoformat(),
                "flight_type": "training",
                "pilot_requirement": "private",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["status"] == "pending approval"

    def test_validation_errors_return_400_not_500(
        self, api_client, sample_aircraft, sample_pilot_profile
    ):
        api_client.force_authenticate(user=sample_pilot_profile)
        url = reverse("company-flight-request")
        response = api_client.post(
            url,
            {"aircraft": sample_aircraft.id, "origin": "KBFI", "destination": "KPAE"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data


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
class TestComponentHistoryViews:
    @pytest.fixture
    def sample_installed_component(
        self, db, sample_company, sample_aircraft, sample_user, sample_part
    ):
        from api.models import InstalledComponent, ComponentEvent
        from django.utils import timezone

        comp = InstalledComponent.objects.create(
            company=sample_company,
            part=sample_part,
            part_number=sample_part.part_number,
            part_name=sample_part.name,
            serial_number="SN-001",
            component_type=InstalledComponent.ComponentType.SERIALIZED,
            aircraft=sample_aircraft,
            limit_type=InstalledComponent.LimitType.HOURS,
            limit_value=1000,
            used_value=100,
        )
        ComponentEvent.objects.create(
            component=comp,
            event_type=ComponentEvent.EventType.INSTALL,
            occurred_at=timezone.now(),
            aircraft=sample_aircraft,
            summary="Installed for test",
            actor=sample_user,
        )
        return comp

    def test_mechanic_can_search_components(
        self, authenticated_client, sample_installed_component
    ):
        url = reverse("component-history-list")
        response = authenticated_client.get(url, {"q": "P-TEST"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1
        assert any(r["id"] == sample_installed_component.id for r in response.data["results"])

    def test_mechanic_can_register_component(
        self, authenticated_client, sample_company, sample_aircraft, sample_part
    ):
        from api.models import InstalledComponent

        url = reverse("component-history-list")
        response = authenticated_client.post(
            url,
            {
                "part_id": sample_part.id,
                "serial_number": "HYD-4567",
                "component_type": "serialized",
                "aircraft": sample_aircraft.id,
                "location": "Shop 13",
                "limit_type": "hours",
                "limit_value": "130",
                "used_value": "43",
                "installed_at": "2026-05-29",
                "initial_event_summary": "Installed during 100 hour inspection",
                "notes": "Test register",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["part_number"] == sample_part.part_number
        assert InstalledComponent.objects.filter(serial_number="HYD-4567").exists()

    def test_platform_admin_can_register_with_company_header(
        self, api_client, sample_company, sample_aircraft, sample_part
    ):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        admin = User.objects.create_user(
            username="platform.comp",
            email="admin@example.com",
            password="pass12345",
            is_staff=True,
            is_superuser=True,
        )
        api_client.force_authenticate(user=admin)
        url = reverse("component-history-list")
        response = api_client.post(
            url,
            {
                "part_id": sample_part.id,
                "serial_number": "ADM-9901",
                "component_type": "serialized",
                "aircraft": sample_aircraft.id,
                "limit_type": "hours",
                "limit_value": "100",
                "used_value": "10",
            },
            format="json",
            HTTP_X_COMPANY_ID=str(sample_company.id),
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_dispatcher_cannot_access_component_history(self, api_client, sample_company):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        dispatcher = User.objects.create_user(
            username="disp.comp",
            email="disp@example.com",
            password="pass12345",
            company=sample_company,
            company_role="dispatcher",
        )
        api_client.force_authenticate(user=dispatcher)
        url = reverse("component-history-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_component_detail_and_export(
        self, authenticated_client, sample_installed_component
    ):
        detail_url = reverse(
            "component-history-detail", kwargs={"pk": sample_installed_component.id}
        )
        detail = authenticated_client.get(detail_url)
        assert detail.status_code == status.HTTP_200_OK
        assert len(detail.data["events"]) >= 1

        export_url = reverse(
            "component-history-export", kwargs={"pk": sample_installed_component.id}
        )
        export_resp = authenticated_client.get(export_url)
        assert export_resp.status_code == status.HTTP_200_OK
        assert "text/csv" in export_resp["Content-Type"]
        assert b"P-TEST" in export_resp.content


@pytest.mark.django_db
class TestLaborEntries:
    def test_create_and_list_labor_entry(
        self, authenticated_client, sample_work_order, sample_user
    ):
        url = reverse("work-order-labor-entries", kwargs={"work_order_pk": sample_work_order.id})
        response = authenticated_client.post(
            url,
            {
                "mechanic": sample_user.id,
                "hours": "2.5",
                "work_date": "2026-05-01",
                "notes": "Troubleshoot",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert float(response.data["hours"]) == 2.5

        list_resp = authenticated_client.get(url)
        assert list_resp.status_code == status.HTTP_200_OK
        assert len(list_resp.data) == 1

    def test_service_history_includes_labor_total(
        self, authenticated_client, sample_work_order, sample_user
    ):
        from api.models import LaborEntry

        LaborEntry.objects.create(
            work_order=sample_work_order,
            mechanic=sample_user,
            hours=3,
            work_date="2026-05-01",
            created_by=sample_user,
        )
        url = reverse(
            "service-history-work-order-detail", kwargs={"pk": sample_work_order.id}
        )
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["labor_hours_total"] == 3.0
        assert len(response.data["labor_entries"]) == 1

    def test_close_work_order_with_labor_hours(
        self, owner_client, sample_work_order
    ):
        from api.models import LaborEntry

        url = reverse("workorders-close", kwargs={"pk": sample_work_order.id})
        response = owner_client.post(
            url,
            {"completion_notes": "Done", "labor_hours": 1.5},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert LaborEntry.objects.filter(work_order=sample_work_order).count() == 1


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


@pytest.mark.django_db
class TestAnalyticsViews:
    def test_maintenance_analytics_requires_manager_or_owner(
        self, authenticated_client
    ):
        url = reverse("analytics-maintenance")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_maintenance_analytics_owner_success(
        self, owner_client, sample_work_order, sample_aircraft
    ):
        url = reverse("analytics-maintenance")
        response = owner_client.get(url, {"aircraft_id": sample_aircraft.id})
        assert response.status_code == status.HTTP_200_OK
        assert "recurring_issues" in response.data
        assert "maintenance_rate" in response.data
        assert "labor_hours" in response.data

    def test_fleet_performance_owner_success(
        self, owner_client, sample_aircraft, sample_flight
    ):
        url = reverse("analytics-fleet-performance")
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "utilization" in response.data
        assert "on_time_performance" in response.data
        assert any(
            row["aircraft_id"] == sample_aircraft.id for row in response.data["utilization"]
        )

    def test_pilot_cannot_access_analytics(self, api_client, sample_pilot_profile):
        api_client.force_authenticate(user=sample_pilot_profile)
        for name in ("analytics-maintenance", "analytics-fleet-performance"):
            response = api_client.get(reverse(name))
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_ata_filter_ignores_non_numeric(
        self, owner_client, sample_work_order, sample_aircraft
    ):
        url = reverse("analytics-maintenance")
        with_ata = owner_client.get(
            url, {"aircraft_id": sample_aircraft.id, "ata": "29"}
        )
        bogus = owner_client.get(
            url, {"aircraft_id": sample_aircraft.id, "ata": "hydraulic"}
        )
        assert with_ata.status_code == status.HTTP_200_OK
        assert bogus.status_code == status.HTTP_200_OK
        assert bogus.data["filters"]["ata"] is None


@pytest.mark.django_db
class TestTenantIsolation:
    """Cross-tenant access must return 404 (not found), not another company's data."""

    def test_owner_cannot_retrieve_other_company(
        self, owner_client, other_company
    ):
        url = reverse("companies-detail", kwargs={"pk": other_company.id})
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_cannot_retrieve_other_company_flight(
        self, owner_client, other_company_flight
    ):
        url = reverse("flights-detail", kwargs={"pk": other_company_flight.id})
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_flights_list_excludes_other_company(
        self, owner_client, sample_flight, other_company_flight
    ):
        url = reverse("flights-list")
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [row["id"] for row in response.data]
        assert sample_flight.id in ids
        assert other_company_flight.id not in ids

    def test_owner_cannot_retrieve_other_company_profile(
        self, owner_client, other_company_profile
    ):
        url = reverse("profiles-detail", kwargs={"pk": other_company_profile.id})
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_profiles_list_excludes_other_company(
        self, owner_client, sample_profile, other_company_profile
    ):
        url = reverse("profiles-list")
        response = owner_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [row["id"] for row in response.data]
        assert sample_profile.id in ids
        assert other_company_profile.id not in ids

    def test_mechanic_cannot_list_companies(self, authenticated_client):
        url = reverse("companies-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
