import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta


@pytest.mark.django_db
class TestModelIntegration:
    def test_company_management_dashboard_counts(
        self, sample_company, sample_aircraft, sample_work_order, sample_discrepancy, sample_flight
    ):
        data = sample_company.get_management_dashboard_data()

        assert data["total_aircraft"] == 1
        assert data["total_flights"] == 1
        assert data["total_discrepancies"] == 1
        assert data["total_work_orders"] == 1

    def test_company_inventory_data_contains_inventory_part(self, sample_company, sample_inventory_part):
        data = sample_company.get_inventory_data()

        assert len(data) == 1
        entry = data[0]
        assert entry["part_number"] == "TEST-001"
        assert entry["quantity"] == 10
        assert entry["stock_alert"] == 2

    def test_company_workorders_data_contains_nested_parts(self, sample_company, sample_work_order_part):
        data = sample_company.get_workorders_data()

        assert len(data) == 1
        work_order = data[0]
        assert work_order["title"] == "Test Work Order"
        assert len(work_order["parts_needed"]) == 1
        assert work_order["parts_needed"][0]["name"] == "Test Part"
        assert work_order["parts_needed"][0]["quantity"] == 1

    def test_company_discrepancy_data_contains_linked_work_order(self, sample_company, sample_discrepancy):
        data = sample_company.get_discrepancy_data()

        assert len(data) == 1
        discrepancy = data[0]
        assert discrepancy["work_order"][1] == "Test Work Order"
        assert discrepancy["status"] == "pending"

    def test_company_role_data_filters_to_requested_role(self, sample_company, sample_user, sample_pilot_profile):
        mechanics = sample_company.get_company_role_data("mechanic")
        pilots = sample_company.get_company_role_data("pilot")

        assert len(mechanics) == 1
        assert mechanics[0]["username"] == "testuser"
        assert len(pilots) == 1
        assert pilots[0]["username"] == "pilot.user"

    def test_company_availability_excludes_aircraft_with_overlapping_flight(self, sample_company, sample_aircraft, sample_flight):
        start = sample_flight.departure_time - timedelta(minutes=30)
        end = sample_flight.arrival_time + timedelta(minutes=30)

        available = sample_company.availability(start, end)

        assert available == []

    def test_flight_clean_rejects_same_primary_and_secondary(self, sample_company, sample_aircraft, sample_pilot):
        from api.models import Flight

        departure = timezone.now() + timedelta(days=2)
        arrival = departure + timedelta(hours=2)

        flight = Flight(
            company=sample_company,
            aircraft=sample_aircraft,
            flight_number="TST200",
            origin="SLC",
            destination="LAX",
            departure_time=departure,
            arrival_time=arrival,
            primary_pilot=sample_pilot.profile,
            secondary_pilot=sample_pilot.profile,
            pilot_requirement="private",
            status="scheduled",
        )

        with pytest.raises(ValidationError) as exc:
            flight.clean()

        assert "secondary_pilot" in exc.value.message_dict

    def test_flight_clean_rejects_pilot_from_different_company(self, sample_company, sample_aircraft, django_user_model):
        from api.models import Company, Flight

        other_company = Company.objects.create(name="Other Co")
        outsider = django_user_model.objects.create_user(
            username="outside.pilot",
            email="outside@example.com",
            password="outsidepass123",
            first_name="Outside",
            last_name="Pilot",
            company=other_company,
            company_role="pilot",
        )
        outsider_pilot = outsider.pilot_info
        outsider_pilot.medically_cleared_until = timezone.now().date() + timedelta(days=90)
        outsider_pilot.pilot_certificate = "private"
        outsider_pilot.save()

        departure = timezone.now() + timedelta(days=3)
        arrival = departure + timedelta(hours=1)

        flight = Flight(
            company=sample_company,
            aircraft=sample_aircraft,
            flight_number="TST300",
            origin="SLC",
            destination="DEN",
            departure_time=departure,
            arrival_time=arrival,
            primary_pilot=outsider,
            pilot_requirement="private",
            status="scheduled",
        )

        with pytest.raises(ValidationError) as exc:
            flight.clean()

        assert "primary_pilot" in exc.value.message_dict
