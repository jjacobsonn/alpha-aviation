from pathlib import Path
import sys
import pytest

# add project root directory to path to be able to import from root (backend/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@pytest.mark.django_db
class TestAPIs:
    """
    
    """

    def test_example_model_create(self):
        """replace with the model behavior you want to verify"""
        # Arrange
        from api.models import Company

        # Act
        company = Company.objects.create(name="Example Co")

        # Assert
        assert company.id is not None

    @pytest.mark.skip(reason="TODO")
    def test_example_client_get(self, client):
        """replace with a request you want to verify"""
        # Act
        response = client.get("/")

        # Assert
        assert response.status_code in {200, 302, 404}
