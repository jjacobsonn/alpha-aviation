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
            password = "pilot_password100",
            first_name = "Amy",
            last_name = "Hart",
            company = GammaCorp,
            company_role = "pilot",
            middle_name = "C",
            employee_id = 3344,
            phone_number = "1011011001"
        )

        SecondaryPilotProfile = Profile.objects.create(
            username = "pilot.james",
            password = "pilot_password200",
            first_name = "Gary",
            last_name = "James",
            company = GammaCorp,
            company_role = "pilot",
            middle_name = "H",
            employee_id = 9988,
            phone_number = "1239874560"
        )

        EpsilonPilotProfile = Profile.objects.create(
            username = "pilot.lee",
            password = "pilot_password300",
            first_name = "Jordan",
            last_name = "Lee",
            company = EpsilonAir,
            company_role = "pilot",
            middle_name = "A",
            employee_id = 5566,
            phone_number = "2223334444"
        )

        EpsilonSecondaryPilotProfile = Profile.objects.create(
            username = "pilot.nguyen",
            password = "pilot_password400",
            first_name = "Mina",
            last_name = "Nguyen",
            company = EpsilonAir,
            company_role = "pilot",
            middle_name = "T",
            employee_id = 7788,
            phone_number = "3334445555"
        )

        MechanicProfile = Profile.objects.create(
            username = "mechanic.fiennes",
            password = "mechanic_password100",
            first_name = "Felicia",
            last_name = "Fiennes",
            company = EpsilonAir,
            company_role = "mechanic",
            employee_id = 7711,
            phone_number = "1112223333"
        )

        OwnerProfile = Profile.objects.create(
            username = "owner.johnson",
            password = "owner_password100",
            first_name = "Jonathan",
            last_name = "Johnson",
            company = GammaCorp,
            company_role = "owner",
            middle_name = "Geoff",
            employee_id = 9900
        )

        ManagerProfile = Profile.objects.create(
            username = "manager.boris",
            password = "manager_password100",
            first_name = "Riley",
            last_name = "Boris",
            company = EpsilonAir,
            company_role = "manager",
            employee_id = 6622
        )

        # Pilot
        PilotProfile.pilot_info.medically_cleared_until = date(2026, 10, 1)
        PilotProfile.pilot_info.pilot_certificate = "private"
        PilotProfile.pilot_info.save()

        SecondaryPilotProfile.pilot_info.medically_cleared_until = date(2026, 10, 1)
        SecondaryPilotProfile.pilot_info.pilot_certificate = "commercial"
        SecondaryPilotProfile.pilot_info.save()

        EpsilonPilotProfile.pilot_info.medically_cleared_until = date(2026, 10, 1)
        EpsilonPilotProfile.pilot_info.pilot_certificate = "private"
        EpsilonPilotProfile.pilot_info.save()

        EpsilonSecondaryPilotProfile.pilot_info.medically_cleared_until = date(2026, 10, 1)
        EpsilonSecondaryPilotProfile.pilot_info.pilot_certificate = "commercial"
        EpsilonSecondaryPilotProfile.pilot_info.save()

        # Mechanic
        MechanicProfile.mechanic_info.AP_certificate_number = 242526
        MechanicProfile.mechanic_info.inspector_authentication = True
        MechanicProfile.mechanic_info.save()

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
            secondary_pilot = SecondaryPilotProfile,
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
            secondary_pilot = SecondaryPilotProfile,
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
            primary_pilot = EpsilonPilotProfile,
            secondary_pilot = EpsilonSecondaryPilotProfile,
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
            primary_pilot = EpsilonPilotProfile,
            secondary_pilot = EpsilonSecondaryPilotProfile,
            pilot_requirement = "private",
            status = "pending approval"
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

        # Component history (Phase 2 — 3.3.2 demo data)
        from api.models import InstalledComponent, ComponentEvent

        hydraulic_unit = InstalledComponent.objects.create(
            company=GammaCorp,
            part=THydraulic,
            part_number=THydraulic.part_number,
            part_name=THydraulic.name,
            serial_number="HYD-1001",
            component_type=InstalledComponent.ComponentType.SERIALIZED,
            aircraft=TPlane,
            location="Aircraft",
            limit_type=InstalledComponent.LimitType.HOURS,
            limit_value=2000,
            used_value=450,
            installed_at=date(2024, 6, 1),
        )
        brake_unit = InstalledComponent.objects.create(
            company=EpsilonAir,
            part=SBrake,
            part_number=SBrake.part_number,
            part_name=SBrake.name,
            serial_number="BRK-4201",
            component_type=InstalledComponent.ComponentType.SERIALIZED,
            aircraft=SPlane,
            location="Aircraft",
            limit_type=InstalledComponent.LimitType.CYCLES,
            limit_value=500,
            used_value=120,
            installed_at=date(2025, 1, 15),
        )
        fuel_filter = InstalledComponent.objects.create(
            company=EpsilonAir,
            part=SFuel,
            part_number=SFuel.part_number,
            part_name=SFuel.name,
            serial_number="",
            component_type=InstalledComponent.ComponentType.CONSUMABLE,
            aircraft=None,
            location="Hangar B — Shelf 3",
        )

        event_base = timezone.now() - timedelta(days=30)
        ComponentEvent.objects.create(
            component=hydraulic_unit,
            event_type=ComponentEvent.EventType.INSTALL,
            occurred_at=event_base - timedelta(days=400),
            aircraft=TPlane,
            summary=f"Installed on tail {TPlane.registration_number}",
            actor=MechanicProfile,
        )
        ComponentEvent.objects.create(
            component=hydraulic_unit,
            event_type=ComponentEvent.EventType.INSPECTION,
            occurred_at=event_base - timedelta(days=60),
            aircraft=TPlane,
            work_order=THydraulicWO,
            summary="Leak check and pressure verification — satisfactory",
            actor=MechanicProfile,
        )
        ComponentEvent.objects.create(
            component=hydraulic_unit,
            event_type=ComponentEvent.EventType.WORK_ORDER,
            occurred_at=event_base - timedelta(days=14),
            aircraft=TPlane,
            work_order=THydraulicWO,
            summary=f"Linked to work order: {THydraulicWO.title}",
            actor=MechanicProfile,
        )
        ComponentEvent.objects.create(
            component=brake_unit,
            event_type=ComponentEvent.EventType.INSTALL,
            occurred_at=event_base - timedelta(days=200),
            aircraft=SPlane,
            summary=f"Installed on main landing gear — tail {SPlane.registration_number}",
            actor=MechanicProfile,
        )
        ComponentEvent.objects.create(
            component=brake_unit,
            event_type=ComponentEvent.EventType.WORK_ORDER,
            occurred_at=event_base - timedelta(days=7),
            aircraft=SPlane,
            work_order=SBrakeWO,
            summary=f"Brake replacement WO: {SBrakeWO.title}",
            actor=MechanicProfile,
        )
        ComponentEvent.objects.create(
            component=fuel_filter,
            event_type=ComponentEvent.EventType.INSTALL,
            occurred_at=event_base - timedelta(days=90),
            aircraft=SPlane,
            summary="Issued and installed during scheduled fuel system inspection",
            actor=MechanicProfile,
        )
        ComponentEvent.objects.create(
            component=fuel_filter,
            event_type=ComponentEvent.EventType.NOTE,
            occurred_at=event_base - timedelta(days=2),
            summary="Consumable — reorder when stock at or below alert threshold",
            actor=MechanicProfile,
        )