import pytest


@pytest.mark.django_db
class TestCompanyModel:
    def test_company_str(self, sample_company):
        assert str(sample_company) == "Test Company"


@pytest.mark.django_db
class TestProfileModel:
    def test_create_profile(self, sample_profile):
        assert sample_profile.username == "profile.user"
        assert sample_profile.company_role == "owner"

    def test_create_user(self, sample_user):
        assert sample_user.username == "testuser"
        assert sample_user.email == "test@example.com"
        assert sample_user.check_password("testpass123")

    def test_user_str(self, sample_user):
        assert str(sample_user) == "testuser"

    def test_role_helpers(self, sample_user):
        assert sample_user.is_mechanic() is True
        assert sample_user.is_pilot() is False


@pytest.mark.django_db
class TestPilotModel:
    def test_pilot_fixture(self, sample_pilot):
        assert sample_pilot.profile.company_role == "pilot"
        assert sample_pilot.pilot_certificate == "private"

    def test_pilot_is_certified(self, sample_pilot):
        assert sample_pilot.is_certified("student") is True
        assert sample_pilot.is_certified("private") is True
        assert sample_pilot.is_certified("commercial") is False


@pytest.mark.django_db
class TestMechanicModel:
    def test_mechanic_fixture(self, sample_mechanic):
        assert sample_mechanic.profile.company_role == "mechanic"
        assert sample_mechanic.AP_certificate_number == 123456
        assert sample_mechanic.inspector_authentication is True


@pytest.mark.django_db
class TestAircraftModel:
    def test_aircraft_fixture(self, sample_aircraft):
        assert sample_aircraft.registration_number == "N123TEST"
        assert sample_aircraft.company is not None

    def test_aircraft_str(self, sample_aircraft):
        assert str(sample_aircraft) == "N123TEST (Cessna 172)"


@pytest.mark.django_db
class TestPartModel:
    def test_create_part(self, sample_part):
        assert sample_part.part_number == "TEST-001"
        assert sample_part.name == "Test Part"

    def test_part_str(self, sample_part):
        assert str(sample_part) == "TEST-001 - Test Part"


@pytest.mark.django_db
class TestInventoryModel:
    def test_inventory_fixture(self, sample_inventory):
        assert sample_inventory.company is not None

    def test_inventory_str(self, sample_inventory_part):
        text = str(sample_inventory_part.inventory)
        assert "Inventory Main" in text
        assert "Test Company" in text
        assert "1 items" in text


@pytest.mark.django_db
class TestInventoryPartModel:
    def test_inventory_part_fixture(self, sample_inventory_part):
        assert sample_inventory_part.part is not None
        assert sample_inventory_part.inventory is not None
        assert sample_inventory_part.quantity == 10


@pytest.mark.django_db
class TestFlightModel:
    def test_flight_fixture(self, sample_flight):
        assert sample_flight.flight_number == "TST100"
        assert sample_flight.primary_pilot is not None
        assert sample_flight.status == "scheduled"


@pytest.mark.django_db
class TestWorkOrderModel:
    def test_work_order_fixture(self, sample_work_order):
        assert sample_work_order.title == "Test Work Order"
        assert sample_work_order.aircraft is not None

    def test_work_order_str(self, sample_work_order):
        assert "Work Order #" in str(sample_work_order)
        assert "N123TEST" in str(sample_work_order)


@pytest.mark.django_db
class TestWorkOrderPartModel:
    def test_work_order_part_fixture(self, sample_work_order_part):
        assert sample_work_order_part.work_order is not None
        assert sample_work_order_part.part is not None
        assert sample_work_order_part.quantity == 1


@pytest.mark.django_db
class TestDiscrepancyModel:
    def test_discrepancy_fixture(self, sample_discrepancy):
        assert sample_discrepancy.aircraft is not None
        assert sample_discrepancy.reporter is not None
        assert sample_discrepancy.status == "pending"

    def test_discrepancy_str(self, sample_discrepancy):
        assert "Discrepancy on" in str(sample_discrepancy)