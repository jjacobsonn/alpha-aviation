""" Unit tests for the 'seed' custom Django management command """

from pathlib import Path
import sys
import pytest
from django.core.management import call_command
from datetime import date, timedelta

# add project root directory to path to be able to import from root (backend/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(scope="function")
def seeded_db(db):
	"""Fixture that seeds the database before each test"""
	call_command('seed', verbosity=0)
	return db


@pytest.mark.django_db
class TestSeedCommand:
	"""Test the seed management command"""

	def test_seed_command_runs_successfully(self, seeded_db):
		"""Verify that the seed command executes without errors"""
		# If we get here without exception, the command ran successfully
		assert True

	def test_companies_created(self, seeded_db):
		"""Verify the correct number of companies are created"""
		from api.models import Company
		
		companies = Company.objects.all()
		assert companies.count() == 2
		
		company_names = {c.name for c in companies}
		assert "Gamma Corp" in company_names
		assert "Epsilon Air" in company_names

	def test_profiles_created(self, seeded_db):
		"""Verify the correct number and types of profiles are created"""
		from api.models import Profile
		
		profiles = Profile.objects.all()
		assert profiles.count() == 7
		
		# Check each role exists
		assert Profile.objects.filter(company_role="pilot").count() == 4
		assert Profile.objects.filter(company_role="mechanic").count() == 1
		assert Profile.objects.filter(company_role="owner").count() == 1
		assert Profile.objects.filter(company_role="manager").count() == 1

	def test_pilot_created(self, seeded_db):
		"""Verify pilot profile and pilot info are created"""
		from api.models import Profile, Pilot
		
		pilot_profile = Profile.objects.get(username="pilot.hart")
		assert pilot_profile.first_name == "Amy"
		assert pilot_profile.last_name == "Hart"
		assert pilot_profile.company_role == "pilot"
		
		# Check that Pilot object was auto-created
		pilot = Pilot.objects.get(profile=pilot_profile)
		assert pilot.pilot_certificate == "private"
		assert pilot.medically_cleared_until == date(2026, 10, 1)

	def test_mechanic_created(self, seeded_db):
		"""Verify mechanic profile and mechanic info are created"""
		from api.models import Profile, Mechanic
		
		mechanic_profile = Profile.objects.get(username="mechanic.fiennes")
		assert mechanic_profile.first_name == "Felicia"
		assert mechanic_profile.last_name == "Fiennes"
		assert mechanic_profile.company_role == "mechanic"
		
		# Check that Mechanic object was auto-created
		mechanic = Mechanic.objects.get(profile=mechanic_profile)
		assert mechanic.AP_certificate_number == 242526
		assert mechanic.inspector_authentication is True

	def test_aircraft_created(self, seeded_db):
		"""Verify the correct number and details of aircraft are created"""
		from api.models import Aircraft
		
		aircraft = Aircraft.objects.all()
		assert aircraft.count() == 2
		
		# Check Hawk aircraft
		hawk = Aircraft.objects.get(registration_number=1400)
		assert hawk.model == "Hawk"
		assert hawk.manufacturer == "ABCD"
		assert hawk.engine_type == "Turboprop"
		
		# Check Eagle aircraft
		eagle = Aircraft.objects.get(registration_number=4040)
		assert eagle.model == "Eagle"
		assert eagle.manufacturer == "EFGH"
		assert eagle.engine_type == "Turbojet"

	def test_parts_created(self, seeded_db):
		"""Verify the correct number of parts are created"""
		from api.models import Part
		
		parts = Part.objects.all()
		assert parts.count() == 4
		
		# Check specific parts exist
		assert Part.objects.filter(part_number="H-100").exists()
		assert Part.objects.filter(part_number="A-210").exists()
		assert Part.objects.filter(part_number="F-330").exists()
		assert Part.objects.filter(part_number="B-420").exists()

	def test_inventory_created(self, seeded_db):
		"""Verify the correct number of inventories and inventory parts are created"""
		from api.models import Inventory, InventoryPart
		
		inventories = Inventory.objects.all()
		assert inventories.count() == 2
		
		# Check total inventory parts
		inventory_parts = InventoryPart.objects.all()
		assert inventory_parts.count() == 4

	def test_inventory_part_details(self, seeded_db):
		"""Verify inventory part details are correctly set"""
		from api.models import Part, InventoryPart
		
		hydraulic_part = Part.objects.get(part_number="H-100")
		hydraulic_inv_part = InventoryPart.objects.get(part=hydraulic_part)
		
		assert hydraulic_inv_part.quantity == 3
		assert hydraulic_inv_part.stock_alert == 2
		assert hydraulic_inv_part.stock_alert_percentage == 0.20
		assert hydraulic_inv_part.shop_location == "Hangar A"

	def test_work_orders_created(self, seeded_db):
		"""Verify the correct number of work orders are created"""
		from api.models import WorkOrder
		
		work_orders = WorkOrder.objects.all()
		assert work_orders.count() == 2
		
		# Check statuses
		assert WorkOrder.objects.filter(status="in_progress").count() == 1
		assert WorkOrder.objects.filter(status="awaiting_parts").count() == 1

	def test_work_order_parts_created(self, seeded_db):
		"""Verify the correct number of work order parts are created"""
		from api.models import WorkOrderPart
		
		work_order_parts = WorkOrderPart.objects.all()
		assert work_order_parts.count() == 3

	def test_discrepancies_created(self, seeded_db):
		"""Verify the correct number of discrepancies are created"""
		from api.models import Discrepancy
		
		discrepancies = Discrepancy.objects.all()
		assert discrepancies.count() == 2
		
		# All should be pending status
		assert Discrepancy.objects.filter(status="pending").count() == 2

	def test_flights_created(self, seeded_db):
		"""Verify the correct number of flights are created"""
		from api.models import Flight
		
		flights = Flight.objects.all()
		assert flights.count() == 4

	def test_flight_statuses(self, seeded_db):
		"""Verify flight statuses are correctly set"""
		from api.models import Flight
		
		# Check that flights have correct statuses
		approved_flights = Flight.objects.filter(status="approved")
		assert approved_flights.count() == 2
		
		pending_flights = Flight.objects.filter(status="pending approval")
		assert pending_flights.count() == 2

	def test_flight_pilots(self, seeded_db):
		"""Verify that flights have the correct pilot assignments"""
		from api.models import Flight, Profile
		
		pilot = Profile.objects.get(username="pilot.hart")
		gamma_flights = Flight.objects.filter(primary_pilot=pilot)
		
		# Pilot should be assigned to 2 Gamma Corp flights
		assert gamma_flights.count() == 2

	def test_relationships_integrity(self, seeded_db):
		"""Verify that foreign key relationships are correctly maintained"""
		from api.models import Company, Aircraft, Profile, WorkOrder
		
		gamma_corp = Company.objects.get(name="Gamma Corp")
		
		# Check that aircraft are linked to correct company
		assert Aircraft.objects.filter(company=gamma_corp).count() == 1
		
		# Check that profiles are linked to correct company
		assert Profile.objects.filter(company=gamma_corp).count() == 3
		
		# Check that work orders are linked to correct aircraft
		gamma_aircraft = Aircraft.objects.filter(company=gamma_corp).first()
		assert WorkOrder.objects.filter(aircraft=gamma_aircraft).count() == 1