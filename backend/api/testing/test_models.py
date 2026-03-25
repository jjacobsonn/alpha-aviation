import pytest
from django.contrib.auth import get_user_model

Profile = get_user_model()

@pytest.mark.django_db
class TestProfileModel:
    def test_create_user(self, test_user):
        """Test user creation"""
        assert test_user.username == "testuser"
        assert test_user.email == "test@example.com"
        assert test_user.check_password("testpass123")
    
    def test_user_str(self, test_user):
        """Test user string representation"""
        assert str(test_user) == "testuser"

@pytest.mark.django_db
class TestPartModel:
    def test_create_part(self, test_part):
        """Test part creation"""
        assert test_part.part_number == "TEST-001"
        assert test_part.quantity == 10
    
    def test_part_in_inventory(self, test_part):
        """Test part belongs to inventory"""
        assert test_part.inventory is not None
        assert test_part.inventory.name == "Test Inventory"