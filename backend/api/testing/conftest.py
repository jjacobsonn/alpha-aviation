# pytest configuration and fixtures

import pytest
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def sample_company(db):
    """Create a test company"""
    from api.models import Company

    return Company.objects.create(name="Test Company")


@pytest.fixture
def sample_profile(db, sample_company, django_user_model):
    """Create a base profile (owner role)"""
    return django_user_model.objects.create_user(
        username="profile.user",
        email="profile@example.com",
        password="profilepass123",
        first_name="Profile",
        last_name="User",
        company=sample_company,
        company_role="owner",
    )


@pytest.fixture
def sample_aircraft(db, sample_company):
    """Create a test aircraft"""
    from api.models import Aircraft

    return Aircraft.objects.create(
        registration_number="N123TEST",
        model="Cessna 172",
        manufacturer="Cessna",
        engine_type="Piston",
        year_built=2001,
        company=sample_company,
    )


@pytest.fixture
def sample_pilot_profile(db, sample_company, django_user_model):
    """Create a pilot profile"""
    return django_user_model.objects.create_user(
        username="pilot.user",
        email="pilot@example.com",
        password="pilotpass123",
        first_name="Pilot",
        last_name="User",
        company=sample_company,
        company_role="pilot",
    )


@pytest.fixture
def sample_user(db, sample_company, django_user_model):
    """Create a test user"""
    return django_user_model.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
        company=sample_company,
        company_role="mechanic",
    )


@pytest.fixture
def sample_pilot(db, sample_pilot_profile):
    """Create/update pilot info model"""
    pilot = sample_pilot_profile.pilot_info
    pilot.medically_cleared_until = timezone.now().date() + timedelta(days=60)
    pilot.pilot_certificate = "private"
    pilot.save()
    return pilot


@pytest.fixture
def sample_mechanic(db, sample_user):
    """Create/update mechanic info model"""
    mechanic = sample_user.mechanic_info
    mechanic.AP_certificate_number = 123456
    mechanic.inspector_authentication = True
    mechanic.save()
    return mechanic

@pytest.fixture
def test_admin(db, django_user_model):
    """Create a test admin user"""
    return django_user_model.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="adminpass123"
    )

@pytest.fixture
def sample_part(db, sample_aircraft):
    """Create a test part"""
    from api.models import Part

    return Part.objects.create(
        part_number="TEST-001",
        name="Test Part",
        description="Test Part",
        aircraft=sample_aircraft,
    )


@pytest.fixture
def sample_inventory(db, sample_company):
    """Create a test inventory"""
    from api.models import Inventory

    return Inventory.objects.create(company=sample_company)


@pytest.fixture
def sample_inventory_part(db, sample_inventory, sample_part):
    """Create inventory-part relationship with quantity"""
    from api.models import InventoryPart

    return InventoryPart.objects.create(
        inventory=sample_inventory,
        part=sample_part,
        quantity=10,
        stock_alert=2,
        stock_alert_percentage=0.10,
    )


@pytest.fixture
def sample_inventory_item(sample_inventory_part):
    """Backward-compatible alias used by existing tests"""
    return sample_inventory_part


@pytest.fixture
def sample_flight(db, sample_company, sample_aircraft, sample_pilot):
    """Create a flight"""
    from api.models import Flight

    departure = timezone.now() + timedelta(days=1)
    arrival = departure + timedelta(hours=2)

    return Flight.objects.create(
        company=sample_company,
        aircraft=sample_aircraft,
        flight_number="TST100",
        origin="SLC",
        destination="PVU",
        departure_time=departure,
        arrival_time=arrival,
        route="SLC-PVU",
        flight_type="training",
        primary_pilot=sample_pilot.profile,
        pilot_requirement="private",
        status="scheduled",
    )


@pytest.fixture
def sample_work_order(db, sample_aircraft, sample_user):
    """Create a work order"""
    from api.models import WorkOrder

    return WorkOrder.objects.create(
        aircraft=sample_aircraft,
        created_by=sample_user,
        title="Test Work Order",
        description="Inspect component",
        status="open",
    )


@pytest.fixture
def sample_work_order_part(db, sample_work_order, sample_part):
    """Create work-order part relationship"""
    from api.models import WorkOrderPart

    return WorkOrderPart.objects.create(
        work_order=sample_work_order,
        part=sample_part,
        quantity=1,
    )


@pytest.fixture
def sample_discrepancy(db, sample_work_order, sample_aircraft, sample_user):
    """Create a discrepancy"""
    from api.models import Discrepancy

    return Discrepancy.objects.create(
        work_order=sample_work_order,
        aircraft=sample_aircraft,
        reporter=sample_user,
        description="Test discrepancy",
        ata_code="29",
        tach_time="1234.5",
        status="pending",
    )

@pytest.fixture
def api_client():
    """Provide Django REST Framework test client"""
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, sample_user):
    """Provide authenticated API client"""
    api_client.force_authenticate(user=sample_user)
    return api_client