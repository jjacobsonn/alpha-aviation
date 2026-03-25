import pytest
from django.contrib.auth import get_user_model
from api.models import Part, Inventory, Flight

Profile = get_user_model()

@pytest.fixture
def test_user(db):
    """Create a test user"""
    return Profile.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User"
    )

@pytest.fixture
def test_admin(db):
    """Create a test admin user"""
    return Profile.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="adminpass123"
    )

@pytest.fixture
def test_part(db):
    """Create a test part"""
    inventory = Inventory.objects.create(name="Test Inventory")
    return Part.objects.create(
        part_number="TEST-001",
        description="Test Part",
        quantity=10,
        inventory=inventory
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