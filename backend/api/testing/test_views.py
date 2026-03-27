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
