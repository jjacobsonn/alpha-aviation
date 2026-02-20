from django.core.management.base import BaseCommand
from api.models import Company, Profile, Pilot, Mechanic, Aircraft, Part, Inventory, Flight


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


        # Mechanic

        # Aircraft

        # Part

        # Inventory

        # Flight