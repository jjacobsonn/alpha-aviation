import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestAuthenticationAPI:
    def test_login_success(self, api_client, sample_user):
        """Test successful login"""
        url = reverse('login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        url = reverse('login')
        data = {
            'username': 'invalid',
            'password': 'wrong'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.django_db
class TestPartAPI:
    def test_list_parts_authenticated(self, authenticated_client, sample_part):
        """Test listing parts with authentication"""
        url = reverse('part-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
    
    def test_list_parts_unauthenticated(self, api_client):
        """Test listing parts without authentication"""
        url = reverse('part-list')
        response = api_client.get(url)
        assert response.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}