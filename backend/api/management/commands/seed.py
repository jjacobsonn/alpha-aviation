from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Company, Profile, Pilot, Mechanic, Aircraft, Part, Inventory, InventoryPart, Flight, WorkOrder, WorkOrderPart, Discrepancy
from datetime import date, timedelta


class Command(BaseCommand):
    help = "Seed the database with example data (warning: destructive, will remove all current rows)"

    def handle(self, *args, **kwargs):
        # reset rows
        Company.objects.all().delete()
        Profile.objects.all().delete()
        Pilot.objects.all().delete()
        Mechanic.objects.all().delete()
        Aircraft.objects.all().delete()
        Part.objects.all().delete()
        Inventory.objects.all().delete()
        WorkOrder.objects.all().delete()
        WorkOrderPart.objects.all().delete()
        Discrepancy.objects.all().delete()
        Flight.objects.all().delete()

        # Company
        GammaCorp = Company.objects.create(
            name = "Gamma Corp",
            locations = "Provo, SLC, Atlanta"
        )
        EpsilonAir = Company.objects.create(
            name = "Epsilon Air",
            locations = "SLC, Chicago, NYC, Seattle"
        )

        # Profile
        PilotProfile = Profile.objects.create(
            username = "pilot.hart",
            first_name = "Amy",
            last_name = "Hart",
            company = GammaCorp,
            company_role = "pilot",
            middle_name = "C",
            employee_id = 3344,
            phone_number = "1011011001"
        )

        MechanicProfile = Profile.objects.create(
            username = "mechanic.fiennes",
            first_name = "Felicia",
            last_name = "Fiennes",
            company = EpsilonAir,
            company_role = "mechanic",
            employee_id = 7711,
            phone_number = "1112223333"
        )

        OwnerProfile = Profile.objects.create(
            username = "owner.johnson",
            first_name = "Jonathan",
            last_name = "Johnson",
            company = GammaCorp,
            company_role = "owner",
            middle_name = "Geoff",
            employee_id = 9900
        )

        ManagerProfile = Profile.objects.create(
            username = "manager.boris",
            first_name = "Riley",
            last_name = "Boris",
            company = EpsilonAir,
            company_role = "manager",
            employee_id = 6622
        )

        # Pilot
        Pilot.objects.update_or_create(
            profile = PilotProfile,
            defaults = {
                "medically_cleared_until": date(2026, 10, 1),
                "pilot_certificate": "private"
            }
        )

        # Mechanic
        Mechanic.objects.update_or_create(
            profile = MechanicProfile,
            defaults = {
                "AP_certificate_number": 242526,
                "inspector_authentication": True
            }
        )

        # Aircraft
        TPlane = Aircraft.objects.create(
            registration_number = 1400,
            model = "Hawk",
            manufacturer = "ABCD",
            engine_type = "Turboprop",
            year_built = 2016,
            company = GammaCorp
        )

        SPlane = Aircraft.objects.create(
            registration_number = 4040,
            model = "Eagle",
            manufacturer = "EFGH",
            engine_type = "Turbojet",
            year_built = 2020,
            company = EpsilonAir
        )

        # Part
        THydraulic = Part.objects.create(
            part_number = "H-100",
            name = "Hydraulic Pump",
            description = "Primary hydraulic pump for landing gear.",
            aircraft = TPlane
        )

        TAvionics = Part.objects.create(
            part_number = "A-210",
            name = "Avionics Bay Module",
            description = "Navigation and comms module.",
            aircraft = TPlane
        )

        SFuel = Part.objects.create(
            part_number = "F-330",
            name = "Fuel Control Unit",
            description = "Fuel flow and pressure control.",
            aircraft = SPlane
        )

        SBrake = Part.objects.create(
            part_number = "B-420",
            name = "Brake Assembly",
            description = "Main wheel brake assembly.",
            aircraft = SPlane
        )

        # Inventory
        GammaCorp_Inventory = Inventory.objects.create(company = GammaCorp)
        EpsilonAir_Inventory = Inventory.objects.create(company = EpsilonAir)

        InventoryPart.objects.create(
            inventory = GammaCorp_Inventory,
            part = THydraulic,
            quantity = 3,
            stock_alert = 2,
            stock_alert_percentage = 0.20,
            shop_location = "Hangar A"
        )

        InventoryPart.objects.create(
            inventory = GammaCorp_Inventory,
            part = TAvionics,
            quantity = 1,
            stock_alert = 1,
            stock_alert_percentage = 0.10,
            shop_location = "Hangar A"
        )

        InventoryPart.objects.create(
            inventory = EpsilonAir_Inventory,
            part = SFuel,
            quantity = 4,
            stock_alert = 2,
            stock_alert_percentage = 0.15,
            shop_location = "Hangar B"
        )

        InventoryPart.objects.create(
            inventory = EpsilonAir_Inventory,
            part = SBrake,
            quantity = 2,
            stock_alert = 2,
            stock_alert_percentage = 0.10,
            shop_location = "Hangar B"
        )

        # WorkOrder & WorkOrderPart
        THydraulicWO = WorkOrder.objects.create(
            aircraft = TPlane,
            created_by = MechanicProfile,
            title = "Hydraulic pump inspection",
            description = "Inspect for leaks and verify pressure stability.",
            status = "in_progress",
            due_by = date(2026, 3, 1),
            tach_time = 1245.6,
            hobbs_time = 1188.4,
            ATA_code = 29,
            components_affected = "Hydraulic system"
        )

        SBrakeWO = WorkOrder.objects.create(
            aircraft = SPlane,
            created_by = MechanicProfile,
            title = "Brake assembly replacement",
            description = "Replace worn brake assembly and verify taxi test.",
            status = "awaiting_parts",
            due_by = date(2026, 2, 28),
            tach_time = 980.2,
            hobbs_time = 944.9,
            ATA_code = 32,
            components_affected = "Landing gear / brakes"
        )

        WorkOrderPart.objects.create(
            work_order = THydraulicWO,
            part = THydraulic,
            quantity = 1
        )

        WorkOrderPart.objects.create(
            work_order = THydraulicWO,
            part = TAvionics,
            quantity = 1
        )

        WorkOrderPart.objects.create(
            work_order = SBrakeWO,
            part = SBrake,
            quantity = 2
        )

        # Discrepancy
        Discrepancy.objects.create(
            work_order = THydraulicWO,
            aircraft = TPlane,
            reporter = PilotProfile,
            description = "Hydraulic pressure warning light during climb.",
            ata_code = "29",
            tach_time = "1245.6",
            status = "pending"
        )

        Discrepancy.objects.create(
            work_order = SBrakeWO,
            aircraft = SPlane,
            reporter = MechanicProfile,
            description = "Right main brake squeal and reduced stopping power.",
            ata_code = "32",
            tach_time = "980.2",
            status = "pending"
        )

        # Flight
        base_time = timezone.now() + timedelta(days=1)

        Flight.objects.create(
            company = GammaCorp,
            aircraft = TPlane,
            flight_number = "GC101",
            origin = "SLC",
            destination = "PVU",
            departure_time = base_time,
            arrival_time = base_time + timedelta(hours=1, minutes=10),
            route = "SLC-PVU",
            flight_type = "training",
            primary_pilot = PilotProfile,
            pilot_requirement = "private",
            status = "approved"
        )

        Flight.objects.create(
            company = GammaCorp,
            aircraft = TPlane,
            flight_number = "GC205",
            origin = "PVU",
            destination = "SLC",
            departure_time = base_time + timedelta(days=2),
            arrival_time = base_time + timedelta(days=2, hours=1, minutes=5),
            route = "PVU-SLC",
            flight_type = "charter",
            primary_pilot = PilotProfile,
            pilot_requirement = "private",
            status = "pending approval"
        )

        Flight.objects.create(
            company = EpsilonAir,
            aircraft = SPlane,
            flight_number = "EA330",
            origin = "SLC",
            destination = "SEA",
            departure_time = base_time + timedelta(days=3),
            arrival_time = base_time + timedelta(days=3, hours=2, minutes=40),
            route = "SLC-SEA",
            flight_type = "positioning",
            pilot_requirement = "private",
            status = "approved"
        )

        Flight.objects.create(
            company = EpsilonAir,
            aircraft = SPlane,
            flight_number = "EA331",
            origin = "SEA",
            destination = "SLC",
            departure_time = base_time + timedelta(days=4),
            arrival_time = base_time + timedelta(days=4, hours=2, minutes=30),
            route = "SEA-SLC",
            flight_type = "maintenance ferry",
            pilot_requirement = "private",
            status = "pending approval"
        )