# pytest configuration and fixtures

import pytest


@pytest.fixture
def test_company(db):
    """Create a test company"""
    from api.models import Company

    return Company.objects.create(name="Test Company")


@pytest.fixture
def test_aircraft(db, test_company):
    """Create a test aircraft"""
    from api.models import Aircraft

    return Aircraft.objects.create(
        registration_number="N123TEST",
        model="Cessna 172",
        manufacturer="Cessna",
        engine_type="Piston",
        year_built=2001,
        company=test_company,
    )

@pytest.fixture
def test_user(db, test_company, django_user_model):
    """Create a test user"""
    return django_user_model.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
        company=test_company,
        company_role="mechanic",
    )

@pytest.fixture
def test_admin(db, django_user_model):
    """Create a test admin user"""
    return django_user_model.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="adminpass123"
    )

@pytest.fixture
def test_part(db, test_aircraft):
    """Create a test part"""
    from api.models import Part

    return Part.objects.create(
        part_number="TEST-001",
        name="Test Part",
        description="Test Part",
        aircraft=test_aircraft,
    )


@pytest.fixture
def test_inventory(db, test_company):
    """Create a test inventory"""
    from api.models import Inventory

    return Inventory.objects.create(company=test_company)


@pytest.fixture
def test_inventory_item(db, test_inventory, test_part):
    """Create inventory-part relationship with quantity"""
    from api.models import InventoryPart

    return InventoryPart.objects.create(
        inventory=test_inventory,
        part=test_part,
        quantity=10,
        stock_alert=2,
        stock_alert_percentage=0.10,
    )

@pytest.fixture
def api_client():
    """Provide Django REST Framework test client"""
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, test_user):
    """Provide authenticated API client"""
    api_client.force_authenticate(user=test_user)
    return api_client