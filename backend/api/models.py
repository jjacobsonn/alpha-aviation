from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q
from decimal import Decimal




#Company model, points to user, aircraft, inventory, and flights. Has two methods for checking availability of aircraft and for giving all of the flights in a given time period.
class Company(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    locations =models.CharField(null=True, blank=True)
    

    def __str__(self):
        return self.name
    
    #seeing what aircraft are available for a given time period, can check just one aircraft or all aircrafts uses datetimefield
    def availability(self, start_date, end_date, aircraft_id=None):
        if aircraft_id is None:
            # Check all aircraft
            available_aircraft = []
            for aircraft in self.aircraft.all():
                clean = True
                if aircraft.fleet_status == 'active':
                    for flight in aircraft.flights.all():
                        if flight.departure_time < end_date and flight.arrival_time > start_date:
                            clean = False
                            break
                else:
                    clean = False
                if clean:
                    available_aircraft.append(aircraft)
            return available_aircraft
        #chekcs a specific aircraft
        else:
            aircraft = self.aircraft.filter(id=aircraft_id).first()
            if not aircraft:
                return []

            for flight in aircraft.flights.all():
                if flight.departure_time < end_date and flight.arrival_time > start_date:
                    return []
            return [aircraft]

    #To give day/week/month view uses datefield
    def calendar_flights(self, start_date, end_date):
        flights = self.flights.all()
        valid_flights = []
        for flight in flights:
            if flight.departure_time.date() <= end_date and flight.departure_time.date() >= start_date:
                valid_flights.append(flight)
        return valid_flights
    
    #for the endpoint of the management dashboard, items are pretty self explanatory.
    def get_management_dashboard_data(self):
        data = {
            'total_aircraft': self.aircraft.count(),
            'total_flights': self.flights.count(),
            'total_discrepancies': Discrepancy.objects.filter(aircraft__company=self).count(),
            'total_work_orders': WorkOrder.objects.filter(aircraft__company=self).count(),
        }
        return data

    #Endpoint for all of the users that belong to this company
    def get_user_data(self):
        users = self.users.all()
        user_data = []
        for user in users:
            user_data.append({
                'id': user.id,
                "profile_img": user.profile_img.url if user.profile_img else None,
                'username': user.username,
                'first_name': user.first_name,
                'middle_name': user.middle_name,
                'last_name': user.last_name,
                'email': user.email,
                'employee_id': user.employee_id,
                'phone_number': user.phone_number,
                'company_role': user.company_role,
            })
        return user_data
    
    #For endpoint for all of the aircraft that is under this company
    def get_aircraft_data(self):
        aircraft = self.aircraft.all()
        aircraft_data = []
        for plane in aircraft:
            aircraft_data.append({
                'id': plane.id,
                'registration_number': plane.registration_number,
                'model': plane.model,
                'manufacturer': plane.manufacturer,
                'engine_type': plane.engine_type,
                'year_built': plane.year_built,
                'hobbs_time': plane.hobbs_time,
            })
        return aircraft_data
    
    #For endpoint for all of the flights that is under this company
    def get_flight_data(self):
        flights = self.flights.all()
        flight_data = []
        for flight in flights:
            flight_data.append({
                'id': flight.id,
                'flight_number': flight.flight_number,
                'aircraft_id': flight.aircraft.id,
                'aircraft_manufacturer': flight.aircraft.manufacturer,
                'aircraft_model': flight.aircraft.model,
                'aircraft_registration': flight.aircraft.registration_number,
                'aircraft_engine_type': flight.aircraft.engine_type,
                'aircraft_year_built': flight.aircraft.year_built,
                'origin': flight.origin,
                'destination': flight.destination,
                'departure_time': flight.departure_time,
                'arrival_time': flight.arrival_time,
                'route': flight.route,
                'flight_type': flight.flight_type,
                'pilot_requirement': flight.pilot_requirement,
                'status': flight.status,
            })
        return flight_data

    #for endpoint for all of the parts in the inventory that is under this company
    def get_inventory_data(self):
        inventory_data = []

        for inventory in self.inventories.all():
            for item in inventory.inventorypart_set.all():
                inventory_data.append({
                    "Inventory_name":inventory.inventory_name,
                    "id": item.id,
                    "part_number": item.part.part_number,
                    "name": item.part.name,
                    "description": item.part.description,
                    "aircraft": item.part.aircraft.model if item.part.aircraft else None,
                    "quantity": item.quantity,
                    "stock_alert": item.stock_alert,
                    "stock_alert_percentage": item.stock_alert_percentage,
                    "shop_location": item.shop_location,
                })

        return inventory_data
    
    #for the endpoint to check the companies inventories for parts that are low stock
    def get_company_low_stock(self):
        low_stock_parts = []
        for inventory in self.inventories.all():
            for item in inventory.inventorypart_set.all():
                if item.low_stock():
                    low_stock_parts.append({"Inventory_id":inventory.id,
                    "Inventory_name":inventory.inventory_name,
                    "part_id":item.part.id,
                    "part_name":item.part.name,
                    "part_number":item.part.part_number,})
        return low_stock_parts

    #for endpoint for all of the workorders that is under this company
    def get_workorders_data(self):
        aircrafts = self.aircraft.all()
        workorder_data = []
        for aircraft in aircrafts:
            workorders = aircraft.work_orders.all()
            for workorder in workorders:
                workorder_data.append({
                    'id': workorder.id,
                    'title': workorder.title,
                    'created_by': (workorder.created_by.first_name, workorder.created_by.last_name),
                    'description': workorder.description,
                    'parts_needed': [
                        {
                        'name':item.part.name,
                        'quantity':item.quantity
                        } for item in workorder.workorderpart_set.all()],
                    'status': workorder.status,
                    'created_at': workorder.created_at,
                    'updated_at': workorder.updated_at,
                    'due_by':workorder.due_by,
                    'aircraft': {'registration_number':workorder.aircraft.registration_number, 'model':workorder.aircraft.model},
                    'tach_time':workorder.tach_time,
                    'hobbs_time':workorder.hobbs_time,
                    'ATA_code':workorder.ATA_code,
                    'components_affected': workorder.components_affected,
                    'components_image':workorder.components_image.url if workorder.components_image else None,
                    'signed_by': (workorder.signed_by.first_name, workorder.signed_by.last_name) if workorder.signed_by else None,
                    'signature':workorder.signature.url if workorder.signature else None,
                    'signature_date': workorder.signature_date,
                })
        return workorder_data

    #endpoint for workorders that are overdue
    def get_overdue_workorders_data(self):
        overdue_workorders = []
        today = timezone.now().date()
        for aircraft in self.aircraft.all():
            workorders = aircraft.work_orders.filter(due_by__lt=today, status__in=['open', 'in_progress', 'awaiting_parts'])
            for workorder in workorders:
                overdue_workorders.append({
                    'id': workorder.id,
                    'title': workorder.title,
                    'created_by': (workorder.created_by.first_name, workorder.created_by.last_name),
                    'description': workorder.description,
                    'parts_needed': [
                        {
                        'name':item.part.name,
                        'quantity':item.quantity
                        } for item in workorder.workorderpart_set.all()],
                    'status': workorder.status,
                    'created_at': workorder.created_at,
                    'updated_at': workorder.updated_at,
                    'due_by':workorder.due_by,
                    'aircraft': {'registration_number':workorder.aircraft.registration_number, 'model':workorder.aircraft.model},
                    'tach_time':workorder.tach_time,
                    'hobbs_time':workorder.hobbs_time,
                    'ATA_code':workorder.ATA_code,
                    'components_affected': workorder.components_affected,
                    'components_image':workorder.components_image.url if workorder.components_image else None,
                    'signed_by': (workorder.signed_by.first_name, workorder.signed_by.last_name) if workorder.signed_by else None,
                    'signature':workorder.signature.url if workorder.signature else None,
                    'signature_date': workorder.signature_date,
                })
        return overdue_workorders
    
    #for endpoint for all of the discrepancies that is under this company
    def get_discrepancy_data(self):
        aircrafts = self.aircraft.all()
        discrepancy_data = []
        for aircraft in aircrafts:
            discrepancies = aircraft.discrepancies.all()
            for discrepancy in discrepancies:
                discrepancy_data.append({
                    'work_order': (discrepancy.work_order.id, discrepancy.work_order.title) if discrepancy.work_order else None,
                    'aircraft': {'registration_number':discrepancy.aircraft.registration_number, 'model':discrepancy.aircraft.model},
                    'reporter': (discrepancy.reporter.first_name, discrepancy.reporter.last_name),
                    'date_reported': discrepancy.date_reported,
                    'description': discrepancy.description,
                    'ata_code': discrepancy.ata_code,
                    'tach_time': discrepancy.tach_time,
                    'status': discrepancy.status
                })
        return discrepancy_data

    #for end point that returns every user in the company that is the role that is given
    def get_company_role_data(self, role):
        profiles = self.users.all()
        role_out = []
        for profile in profiles:
            if profile.company_role == role:
                role_out.append({
                    'id': profile.id,
                    "profile_img": profile.profile_img.url if profile.profile_img else None,
                    'username': profile.username,
                    'first_name': profile.first_name,
                    'middle_name': profile.middle_name,
                    'last_name': profile.last_name,
                    'email': profile.email,
                    'employee_id': profile.employee_id,
                    'phone_number': profile.phone_number,
                    'company_role': profile.company_role,
                })
        return role_out
    
    #function to get how many workorders each airplane has had in the past 100 hours, returns a dictionary with the registration number as the key and the analytics as the value, uses the get_workorder_analytics function in the aircraft model.
    def get_company_airplane_workorder_analytics(self):
        analytics = {}
        for aircraft in self.aircraft.all():
            analytics[aircraft.registration_number] = aircraft.get_workorder_analytics()
        return analytics

    #function to return how many hours each airplane in the company has until next maintenance, returns a dictionary with the registration number as the key and the hours until next maintenance as the value, uses the remaining_hobbs function in the aircraft model.
    def get_company_airplane_remaining_hobbs(self):
        remaining = {}
        for aircraft in self.aircraft.all():
            remaining[aircraft.registration_number] = aircraft.remaining_hobbs()
        return remaining
    
    #function to make a dictionary of all the ATA codes that the company workorders have had, with the number of times that ATA code has come up and the airplanes that it has come up on, returns a dictionary with the ATA code as the key and a tuple with the count and list of airplanes as the value.
    def get_company_recuring_workorders(self):
        ata_codes = {}
        discrepancies = Discrepancy.objects.filter(aircraft__company=self)
        for discrepancy in discrepancies:
            if discrepancy.ata_code in ata_codes:
                ata_codes[discrepancy.ata_code][0] += 1
                if not discrepancy.aircraft.registration_number in ata_codes[discrepancy.ata_code][1]:
                    ata_codes[discrepancy.ata_code][1].append(discrepancy.aircraft.registration_number)
            else:
                ata_codes[discrepancy.ata_code] = [1, [discrepancy.aircraft.registration_number]]
        return ata_codes
    
    #function to get how many long(hours) each airplane has fiown in each month for the past year. returns a dictionary with the registration number as the key and a dictionary of month and hours as the value.
    def get_aircraft_monthly_flight_hours(self):
        data = {}
        for aircraft in self.aircraft.all():
            if aircraft.model not in data:
                data[aircraft.model] = aircraft.get_monthly_flight_hours()
            else:
                monthly_hours = aircraft.get_monthly_flight_hours()
                for month, hours in monthly_hours.items():
                    if month in data[aircraft.model]:
                        data[aircraft.model][month] += hours
                    else:
                        data[aircraft.model][month] = hours
        return data
    
    def get_uptime_downtime(self):
        data = {}
        for aircraft in self.aircraft.all():
            if aircraft.model not in data:
                total_seconds = (timezone.now() - aircraft.created_at).total_seconds()
                total_hours = round(total_seconds / 3600, 2)
                down_hours = round(float(aircraft.calculate_downtime()), 2)
                data[aircraft.model] = {
                    'total_time_hours': total_hours,
                    'down_time_hours': down_hours,
                }
            else:
                data[aircraft.model]['total_time_hours'] += round((timezone.now() - aircraft.created_at).total_seconds() / 3600, 2)
                data[aircraft.model]['down_time_hours'] += round(float(aircraft.calculate_downtime()), 2)
        return data


#Profile models, assigned to a company, with a role in the company, and basic profile information. Has functions for is_(company_role).
class Profile(AbstractUser):
    role_choices = [
        ('owner', 'Owner'),
        ('manager', 'Manager'),
        ('mechanic', 'Mechanic'),
        ('dispatcher', 'Dispatcher'),
        ('pilot', 'Pilot'),
        ('dispatcher', 'Dispatcher'),
    ]
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="users", null=True, blank=True)
    company_role = models.CharField(max_length= 255, choices=role_choices, default='pilot' )
    middle_name = models.CharField(max_length=150, blank=True, null=True)
    employee_id = models.PositiveIntegerField(null=True, blank=True)
    phone_number = models.CharField(max_length=10, blank=True, null=True)
    profile_img = models.ImageField(upload_to= 'profile_pics/', blank= True, null= True)
    must_change_password = models.BooleanField(default=False)

    def clean(self):
        super().clean()
        if self.company and self.employee_id:
            exists = Profile.objects.filter(company = self.company, employee_id = self.employee_id).exclude(pk=self.pk).exists()
            
            if exists:
                raise ValidationError({
                    'employee_id': f"Employee ID {self.employee_id} is already taken for this company."
                })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        if self.company_role == "pilot":
            Pilot.objects.get_or_create(profile = self)
        elif self.company_role == "mechanic":
            Mechanic.objects.get_or_create(profile = self)
            
    def is_mechanic(self):
        return self.company_role == "mechanic"
    
    def is_pilot(self):
        return self.company_role == "pilot"
    
    def is_owner(self):
        return self.company_role == "owner"
    
    def is_manager(self):
        return self.company_role == 'manager'
    
    def is_dispatcher(self):
        return self.company_role == 'dispatcher'
    
class Pilot(models.Model):
    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        related_name="pilot_info"
        )
    medically_cleared_until = models.DateField(null=True, blank=True)
    certificates = [
        ('none', 'None'), #0
        ('student', 'Student'),#1
        ('private', 'Private'),#2
        ('commercial', 'Commercial'),#3
        ('airline', 'Airline'),#4
    ]
    pilot_certificate = models.CharField(max_length= 255, choices=certificates, default='none')
    

    def is_cleared_to_fly(self, flight_date):
        return (
            self.medically_cleared_until
            and self.medically_cleared_until >= flight_date
            and self.pilot_certificate != 'none'
        )

    def is_certified(self, required):
        levels = {
            'none': 0,
            'student': 1,
            'private': 2,
            'commercial': 3,
            'airline': 4,
        }
        current_level = levels.get(self.pilot_certificate, 0)
        required_level = levels.get(required, 0)
        return current_level >= required_level

#Mechanic model, Is a sub class of profile, that anyone that is of the company role mechanic will have. has basic information about mechanics and their certifications.
class Mechanic(models.Model):
    profile = models.OneToOneField(
    Profile,
    on_delete=models.CASCADE,
    related_name="mechanic_info"
    )
    AP_certificate_number = models.PositiveIntegerField(blank=True, null=True)
    mechanic_certificate_img = models.ImageField(upload_to='mechanic_cert/', blank= True, null=True)
    inspector_authentication = models.BooleanField(default= False)
    authentication_img = models.ImageField(upload_to='faa_auth/', null=True, blank=True)

#Aircraft model, has basic information about the aircraft and a str function.
class Aircraft(models.Model):
    FLEET_STATUS_CHOICES = [
        ("active", "Active"),
        ("maintenance_due", "Maintenance Due"),
        ("aog", "AOG"),
        ("grounded", "Grounded"),
    ]

    registration_number = models.CharField(max_length=50)
    model = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200)
    engine_type = models.CharField(max_length=200, null= True)
    year_built = models.IntegerField(validators=[MaxValueValidator(9999),MinValueValidator(1903)])
    location = models.CharField(max_length=100, blank=True, default="")
    tach_current = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)
    hobbs_current = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)
    fleet_status = models.CharField(
        max_length=40, choices=FLEET_STATUS_CHOICES, default="active"
    )
    aircraft_type = models.CharField(max_length=60, blank=True, default="")
    specs = models.JSONField(default=dict, blank=True)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="aircraft", null=True, blank=True )
    aircraft_parts = models.ManyToManyField('Part', blank = True, through='aircraftpart', related_name="aircrafts")
    hobbs_time = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True) #get date when the aircraft was created to use for downtime.
    
    #function to get how many workorders an airplance has had in the past 100 hours.
    def get_workorder_analytics(self):
        hundred_hours_ago = self.hobbs_time - Decimal('100')
        recent_workorders = self.work_orders.filter(hobbs_time__gte=hundred_hours_ago, hobbs_time__lte=self.hobbs_time)
        return {
            'total_workorders': recent_workorders.count(),
            'high_priority_workorders': recent_workorders.filter(priority='high').count(),
            'medium_priority_workorders': recent_workorders.filter(priority='medium').count(),
            'low_priority_workorders': recent_workorders.filter(priority='low').count(),
            'critical_priority_workorders': recent_workorders.filter(priority='critical').count(),
        }

    #function to add all the time of all the flights for aircraft and see if time is over part hobbs
    def check_part_hobbs(self):
        flight_time = Decimal('0')
        for flight in self.flights.all():
            if flight.departure_time > timezone.now():
                flight_hours = (flight.arrival_time - flight.departure_time).total_seconds() / 3600
                flight_time += Decimal(str(flight_hours))
        for part in self.aircraft_parts.all():
            aircraft_part = AircraftPart.objects.filter(aircraft=self, part=part).first()
            if aircraft_part and aircraft_part.expiration_hobbs is not None:
                if self.hobbs_time + flight_time >= aircraft_part.expiration_hobbs:
                    raise ValidationError(f"Flight time({flight_time}) plus current hobbs time({self.hobbs_time}) goes over aircraft part {part.name} expiration hobbs time({aircraft_part.expiration_hobbs}).")

    
    def __str__(self):
        return f"{self.registration_number} ({self.model})"

    def add_hobbs_time(self, hobbs_time):
        self.hobbs_time = (self.hobbs_time) + Decimal(str(hobbs_time))
        self.check_part_hobbs()
        self.save()
    
    def check_fleet_status(self):
        if not self.pk:
            return
        today = timezone.now().date()
        if self.fleet_status == 'active':
            for ap in self.aircraftpart_set.all():
                if ap.expiration_date and ap.expiration_date < today:
                    self.fleet_status = 'maintenance_due'
                    return
                if ap.expiration_hobbs and self.hobbs_time >= ap.expiration_hobbs:
                    self.fleet_status = 'maintenance_due'
                    return
    #function to return how many more hours the airplane has until it needs a part replaced, returns registration number and hours.
    def remaining_hobbs(self):
        remaining = None
        for part in self.aircraft_parts.all():
            aircraft_part = AircraftPart.objects.filter(aircraft=self, part=part).first()
            if aircraft_part and aircraft_part.expiration_hobbs is not None:
                part_remaining = aircraft_part.expiration_hobbs - self.hobbs_time
                if remaining is None or part_remaining < remaining:
                    remaining = part_remaining
        return remaining

    #function to get how many long(hours) this airplane has fiown in each month for the past year. returns a dictionary with the month and hours as the value.
    def get_monthly_flight_hours(self):
        today = timezone.now().date()
        result = {}
        for i in range(12):
            # Step back i months
            month = today.month - i
            year = today.year
            while month <= 0:
                month += 12
                year -= 1
            label = f"{year}-{month:02d}"
            flights = self.flights.filter(
                departure_time__year=year,
                departure_time__month=month,
            )
            total_hours = sum(
                (f.arrival_time - f.departure_time).total_seconds() / 3600
                for f in flights
                if f.arrival_time and f.departure_time
            )
            result[label] = round(total_hours, 2)
        return result

    def calculate_downtime(self):
        total_hours = Decimal('0')
        for workorder in self.work_orders.all():  # .all() fixes the RelatedManager error
            if workorder.status == 'closed' and workorder.created_at and workorder.updated_at:
                hours = (workorder.updated_at - workorder.created_at).total_seconds() / 3600
                total_hours += Decimal(str(hours))
        return total_hours


    def clean(self):
        pass

    def save(self, *args, **kwargs):
        self.check_fleet_status()
        super().save(*args, **kwargs)
    


#Part model, has basic information about the part and a str function. It is related to aircraft.
class Part(models.Model):
    part_number = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.SET_NULL, null=True, blank= True)

    def __str__(self):
        return f"{self.part_number} - {self.name}"


#part that is assigned to an aircraft, holds information about the part, the aircraft it is assigned to, and the expiration date and hobbs time. Has a clean function to make sure that the expiration date is not in the past and that the hobbs time is not too low.
class AircraftPart(models.Model):
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE)
    part = models.ForeignKey('Part', on_delete=models.CASCADE, related_name="part_aircrafts")
    expiration_date = models.DateField(null=True, blank=True)
    expiration_hobbs = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    def clean(self):
        super().clean()
        self._old_part = None
        if self.expiration_date and self.expiration_date < timezone.now().date():
            raise ValidationError({
                "expiration_date": "Expiration date cannot be in the past."
            })
        existing = AircraftPart.objects.filter(aircraft=self.aircraft, part=self.part).exclude(pk=self.pk).order_by('-expiration_hobbs').first()

        if existing:
            if self.expiration_hobbs is not None and existing.expiration_hobbs is not None:
                if self.expiration_hobbs <= existing.expiration_hobbs:
                    raise ValidationError({
                        "expiration_hobbs": f"New expiration hobbs {self.expiration_hobbs} must be greater than existing hobbs {existing.expiration_hobbs}."
                    })
                else:
                    self._old_part = existing
        if self.expiration_hobbs is not None:
            aircraft = self.aircraft

            flight_time = Decimal('0')
            now = timezone.now()

            for flight in aircraft.flights.all():
                if not flight.departure_time or not flight.arrival_time:
                    continue

                if flight.arrival_time > now:
                    start = max(flight.departure_time, now)
                    end = flight.arrival_time
                    hours = (end - start).total_seconds() / 3600
                    flight_time += Decimal(str(hours))

            if aircraft.hobbs_time + flight_time >= self.expiration_hobbs:
                raise ValidationError({
                    "expiration_hobbs": (
                        f"Too low. Current ({aircraft.hobbs_time}) + projected "
                        f"({flight_time}) exceeds limit."
                    )
                })
    
    def __str__(self):
        return f"{self.part.name} on {self.aircraft.registration_number} ({self.aircraft.model})"

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        if hasattr(self, "_old_part") and self._old_part:
            self._old_part.delete()
        self.aircraft.save()

#Inventory model, is to show the inventory of parts for the company, points to company and part. Has a function(low_stock) to show the if the stock is lower than the stock alert percentage.
class Inventory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name= "inventories")
    parts = models.ManyToManyField(Part, blank=True, through='InventoryPart', related_name="inventories")
    inventory_name = models.CharField(max_length=100, default="Main")

    def __str__(self):
        items =self.inventorypart_set.all()
        if not items:
            return f"Inventory {self.inventory_name} for {self.company.name} with no parts"
        return f"Inventory {self.inventory_name} for {self.company.name} with: {len(items)} items"

#sub model for inventory to have a list of parts and their quantities, since inventory can have multiple parts and parts can be in multiple inventories.
class InventoryPart(models.Model):
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    stock_alert = models.PositiveIntegerField(default=0, help_text="Number where stock needs to be reordered")
    stock_alert_percentage = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(1)], default= .10, help_text="What percentile low stock warning shows up")
    shop_location = models.CharField(max_length=100, blank= True, null= True)

    def low_stock(self):
        return (
            self.stock_alert >= self.quantity * (1 + self.stock_alert_percentage)
            or self.stock_alert >= self.quantity
        )

    low_stock.boolean = True
    low_stock.short_description = "Low Stock?"
    def __str__(self):
        return f"{self.part.name} in {self.inventory.company.name} with {self.quantity} in stock"


class InstalledComponent(models.Model):
    """Tracked rotable (P/N + S/N) or consumable (P/N only) for component history."""

    class ComponentType(models.TextChoices):
        SERIALIZED = "serialized", "Serialized"
        CONSUMABLE = "consumable", "Consumable"

    class LimitType(models.TextChoices):
        HOURS = "hours", "Hours"
        CYCLES = "cycles", "Cycles"
        CALENDAR = "calendar", "Calendar"

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="installed_components"
    )
    part = models.ForeignKey(
        Part,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installed_components",
    )
    part_number = models.CharField(max_length=200)
    part_name = models.CharField(max_length=200, blank=True, default="")
    serial_number = models.CharField(max_length=200, blank=True, default="")
    component_type = models.CharField(
        max_length=16, choices=ComponentType.choices, default=ComponentType.SERIALIZED
    )
    aircraft = models.ForeignKey(
        Aircraft,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installed_components",
    )
    location = models.CharField(max_length=200, blank=True, default="")
    limit_type = models.CharField(
        max_length=16, choices=LimitType.choices, blank=True, default=""
    )
    limit_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    used_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, default=0
    )
    limit_due_date = models.DateField(null=True, blank=True)
    installed_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["part_number", "serial_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "part_number", "serial_number"],
                name="unique_installed_component_company_pn_sn",
            )
        ]

    def __str__(self):
        sn = self.serial_number or "—"
        return f"{self.part_number} / {sn}"

    @property
    def remaining_value(self):
        if self.limit_type == self.LimitType.CALENDAR:
            days = self.calendar_days_remaining
            return float(days) if days is not None else None
        if self.limit_value is None:
            return None
        used = self.used_value or 0
        return float(self.limit_value) - float(used)

    @property
    def calendar_days_remaining(self):
        if self.limit_type != self.LimitType.CALENDAR or not self.limit_due_date:
            return None
        from django.utils import timezone

        return (self.limit_due_date - timezone.localdate()).days

    @property
    def calendar_interval_days(self):
        if self.limit_type != self.LimitType.CALENDAR:
            return None
        if self.limit_value is not None:
            return max(1, int(float(self.limit_value)))
        if self.installed_at and self.limit_due_date:
            return max(1, (self.limit_due_date - self.installed_at).days)
        return 365

    @property
    def calendar_used_pct(self):
        if self.limit_type != self.LimitType.CALENDAR:
            return None
        remaining = self.calendar_days_remaining
        interval = self.calendar_interval_days
        if remaining is None or not interval:
            return None
        used_days = interval - remaining
        return min(100, max(0, round(100 * used_days / interval)))


class ComponentHistoryActivity(models.Model):
    """Audit trail for component history corrections."""

    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"

    component = models.ForeignKey(
        InstalledComponent, on_delete=models.CASCADE, related_name="activities"
    )
    component_event = models.ForeignKey(
        "ComponentEvent",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activities",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="component_history_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
        default=EventType.UPDATED,
    )
    summary = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"COMP#{self.component_id} {self.event_type} @ {self.created_at}"


class ComponentEvent(models.Model):
    """Lifecycle event on an installed component."""

    class EventType(models.TextChoices):
        INSTALL = "install", "Install"
        REMOVAL = "removal", "Removal"
        INSPECTION = "inspection", "Inspection"
        WORK_ORDER = "work_order", "Work Order"
        NOTE = "note", "Note"

    component = models.ForeignKey(
        InstalledComponent, on_delete=models.CASCADE, related_name="events"
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    occurred_at = models.DateTimeField()
    aircraft = models.ForeignKey(
        Aircraft, on_delete=models.SET_NULL, null=True, blank=True
    )
    work_order = models.ForeignKey(
        "WorkOrder", on_delete=models.SET_NULL, null=True, blank=True
    )
    summary = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="component_events",
    )

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.component_id} {self.event_type} @ {self.occurred_at}"


class Flight(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, related_name="flights")
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, null=True, related_name="flights")
    flight_number = models.CharField(max_length=250, null=True, blank=True)
    origin = models.CharField(max_length=250, null=True, blank=True)
    destination = models.CharField(max_length=250, null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    route = models.CharField(blank=True, null=True)
    flight_type_options = [
        ("training", "Training"),
        ("charter", "Charter"),
        ("positioning", "Positioning"),
        ("maintenance ferry", "Maintenance Ferry"),
    ]
    flight_type = models.CharField(max_length=255, choices=flight_type_options, default="training")
    primary_pilot = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="primary_pilot",
    )
    secondary_pilot = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="secondary_pilot",
    )
    pilot_req_options = [
        ("student", "Student"),
        ("private", "Private"),
        ("commercial", "Commercial"),
        ("airline", "Airline"),
    ]
    pilot_requirement = models.CharField(max_length=255, choices=pilot_req_options, default="private")
    dispatcher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flight_dispatcher",
    )
    status_type_options = [
        ("scheduled", "Scheduled"),
        ("approved", "Approved"),
        ("pending approval", "Pending Approval"),
        ("delayed", "Delayed"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]
    status = models.CharField(max_length= 255, choices=status_type_options, default='pending approval' )
    
    def save(self, *args, **kwargs):
        self.full_clean() 
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        # Auto-assign company from aircraft
        if self.aircraft and not self.company:
            self.company = self.aircraft.company

        # --- Basic time validation ---
        if not self.departure_time:
            errors["departure_time"] = "Departure time does not exist"

        if not self.arrival_time:
            errors["arrival_time"] = "Arrival time does not exist"
        elif self.departure_time and self.arrival_time < self.departure_time:
            errors["arrival_time"] = "Arrival time cannot be before departure time"

        # --- Pilot validation ---
        def check_pilot(pilot, field_name, require_flight_cert):
            if not pilot:
                return

            if pilot.company_role != "pilot":
                errors[field_name] = f"{pilot.first_name} is not a pilot"
                return

            if pilot.company != self.company:
                errors[field_name] = f"{pilot.first_name} is not in this company"
                return

            if not hasattr(pilot, "pilot_info") or not pilot.pilot_info:
                errors[field_name] = f"{pilot.first_name} has no pilot profile"
                return

            if not pilot.pilot_info.medically_cleared_until or pilot.pilot_info.medically_cleared_until < self.arrival_time.date():
                errors[field_name] = f"{pilot.first_name} is not medically cleared"

            if require_flight_cert and not pilot.pilot_info.is_certified(self.pilot_requirement):
                held = pilot.pilot_info.pilot_certificate or "none"
                errors[field_name] = (
                    f"{pilot.first_name} is not certified for this flight "
                    f"({self.pilot_requirement} required; holds {held})"
                )

        # Prevent same pilot
        if self.primary_pilot and self.secondary_pilot:
            if self.primary_pilot == self.secondary_pilot:
                errors["secondary_pilot"] = "Secondary pilot cannot be the same as primary"

        check_pilot(self.primary_pilot, "primary_pilot", require_flight_cert=True)
        # SIC may hold a lower certificate; primary must satisfy pilot_requirement.
        check_pilot(self.secondary_pilot, "secondary_pilot", require_flight_cert=False)

        # Pilot requests stay pending until dispatch approves; only enforce
        # scheduling constraints (WO blocks, conflicts, hobbs) on real bookings.
        is_pending_request = self.status == "pending approval"

        # --- Aircraft checks (scheduled / approved flights only) ---
        if (
            not is_pending_request
            and self.aircraft
            and self.departure_time
            and self.arrival_time
        ):
            aircraft = Aircraft.objects.get(pk=self.aircraft_id)

            # Work order check
            if aircraft.work_orders.filter(status__in=['open', 'in_progress', 'awaiting_parts']).exists():
                errors["aircraft"] = f"{aircraft} has pending work orders"

            # Conflict check (ignore other pending requests)
            conflict = (
                aircraft.flights.exclude(pk=self.pk)
                .exclude(status__in=["pending approval", "cancelled"])
                .filter(
                    departure_time__lt=self.arrival_time,
                    arrival_time__gt=self.departure_time,
                )
            )
            if conflict.exists():
                errors["aircraft"] = f"{aircraft} has a conflicting flight"

            # --- Hobbs projection check ---
            flight_time = Decimal('0')
            now = timezone.now()

            # Existing flights
            for flight in aircraft.flights.exclude(pk=self.pk):
                if not flight.departure_time or not flight.arrival_time:
                    continue

                if flight.arrival_time > now:
                    start = max(flight.departure_time, now)
                    end = flight.arrival_time
                    hours = (end - start).total_seconds() / 3600
                    flight_time += Decimal(str(hours))

            # THIS flight
            if self.arrival_time > now:
                start = max(self.departure_time, now)
                end = self.arrival_time
                hours = (end - start).total_seconds() / 3600
                flight_time += Decimal(str(hours))

            # Check against part limits
            for ap in AircraftPart.objects.filter(aircraft=aircraft, expiration_hobbs__isnull=False):
                if aircraft.hobbs_time + flight_time >= ap.expiration_hobbs:
                    errors["aircraft"] = (
                        f"{aircraft} exceeds hobbs limit for part {ap.part.name}"
                    )
                    break

        if errors:
            raise ValidationError(errors)


class WorkOrder(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("awaiting_parts", "Awaiting Parts"),
        ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    assignee = models.ForeignKey(
        'Profile', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_work_orders'
    )
    completion_notes = models.TextField(blank=True, null=True)

    aircraft = models.ForeignKey(
        Aircraft, on_delete=models.CASCADE, related_name="work_orders"
    )
    created_by = models.ForeignKey(
        Profile, on_delete=models.SET_NULL, null=True, blank=True
    )
    parts_needed = models.ManyToManyField(
        Part, blank=True, through="WorkOrderPart"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default="open"
    )
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="medium"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_by = models.DateField(null=True, blank=True)
    tach_time = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    hobbs_time = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    ATA_code = models.IntegerField(null=True, blank=True)
    components_affected = models.CharField(max_length=200, blank=True)
    components_image = models.ImageField(
        upload_to="work_order_components/", null=True, blank=True
    )
    signed_by = models.ForeignKey(
        Profile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="signed_work_orders",
    )
    signature = models.ImageField(
        upload_to="work_order_signatures/", null=True, blank=True
    )
    signature_date = models.DateField(null=True, blank=True)
    
    #save function to check if the status has changed to closed, if it has then it will run the _handle_completion function to add an aircraft part to the aircraft.
    def save(self, *args, **kwargs):
        if self.pk:
            old = WorkOrder.objects.filter(pk=self.pk).values("status").first()
            old_status = old["status"] if old else None
        else:
            old_status = None
        super().save(*args, **kwargs)
        if self.status == "closed" and old_status != "closed":
            self._handle_completion()

    #checks date and compares to the workorder created at time to get down time creates a new aircraft part for each part in the work order, with the expiration date and hobbs time based on the work order part information. Also deletes any existing aircraft part for that part, since it is being replaced.
    def _handle_completion(self):
        for wop in self.workorderpart_set.all():
            part = wop.part
            aircraft = self.aircraft
            AircraftPart.objects.filter(aircraft=aircraft, part=part).delete()
            AircraftPart.objects.create(
                aircraft=aircraft,
                part=part,
                expiration_date=wop.part_expiration_date if wop.part_expiration_date else None,
                expiration_hobbs=wop.part_life + aircraft.hobbs_time if wop.part_life else None
            )
    def __str__(self):
        return f"Work Order #{self.id} - {self.aircraft.registration_number}"
    


class WorkOrderPart(models.Model):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    part_life = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, help_text="Number of hobbs hours the part is good for. Optional, only used if part is tracked by hobbs time.")
    part_expiration_date = models.DateField(null=True, blank=True, help_text="Date the part expires. Optional, only used if part is tracked by expiration date.")


class LaborEntry(models.Model):
    """Mechanic labor hours logged against a work order."""

    work_order = models.ForeignKey(
        WorkOrder, on_delete=models.CASCADE, related_name="labor_entries"
    )
    mechanic = models.ForeignKey(
        "Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="labor_entries",
    )
    hours = models.DecimalField(max_digits=8, decimal_places=2)
    work_date = models.DateField()
    notes = models.CharField(max_length=500, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="labor_entries_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-work_date", "-id"]

    def __str__(self):
        return f"WO#{self.work_order_id} {self.hours}h on {self.work_date}"


class Discrepancy(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("closed", "Closed"),
    ]

    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discrepancies",
    )
    aircraft = models.ForeignKey(
        Aircraft, on_delete=models.CASCADE, related_name="discrepancies"
    )
    reporter = models.ForeignKey(Profile, on_delete=models.CASCADE)
    date_reported = models.DateField(auto_now_add=True)
    description = models.CharField(max_length=200)
    ata_code = models.CharField(max_length=50, blank=True)
    tach_time = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    signature = models.ImageField(upload_to="discrepancies_signatures/", null=True, blank=True)
    signature_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"Discrepancy on {self.aircraft} ({self.status})"


class WorkOrderActivity(models.Model):
    """History entries for work order changes."""

    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"

    work_order = models.ForeignKey(
        WorkOrder, on_delete=models.CASCADE, related_name="activities"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_order_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
        default=EventType.UPDATED,
    )
    summary = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"WO#{self.work_order_id} {self.event_type} @ {self.created_at}"


class DiscrepancyActivity(models.Model):
    """History entries for discrepancy updates."""

    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"

    discrepancy = models.ForeignKey(
        Discrepancy, on_delete=models.CASCADE, related_name="activities"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discrepancy_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
        default=EventType.UPDATED,
    )
    summary = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"DISC#{self.discrepancy_id} {self.event_type} @ {self.created_at}"


class FlightActivity(models.Model):
    """History entries for flight request / dispatch changes."""

    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"

    flight = models.ForeignKey(
        Flight, on_delete=models.CASCADE, related_name="activities"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flight_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
        default=EventType.UPDATED,
    )
    summary = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"FLT#{self.flight_id} {self.event_type} @ {self.created_at}"

      
class Tool(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="tools")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    serial_number = models.CharField(max_length=200)
    calibration_due_date = models.DateField()
    location = models.CharField(max_length=200, blank=True, null=True)

    @property
    def calibration_alert(self):
        today = timezone.now().date()
        delta = (self.calibration_due_date - today).days
        if delta < 0:
            return "red"
        if delta <= 10:
            return "amber"
        return "green"

    @property
    def status(self):
        today = timezone.now().date()
        delta = (self.calibration_due_date - today).days
        if delta < 0:
            return "overdue"
        if delta <= 10:
            return "calibration_due"
        return "available"

    def __str__(self):
        return f"{self.name} (S/N: {self.serial_number})"


class CalibrationRecord(models.Model):
    tool = models.ForeignKey(Tool, on_delete=models.CASCADE, related_name="calibration_history")
    calibration_date = models.DateField()
    performed_by = models.CharField(max_length=200)
    next_due_date = models.DateField()
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Calibration of {self.tool.name} on {self.calibration_date} by {self.performed_by}"
        

class AircraftPhoto(models.Model):
    aircraft = models.ForeignKey(
        Aircraft, on_delete=models.CASCADE, related_name="photos"
    )
    image = models.ImageField(upload_to="aircraft_photos/")
    caption = models.CharField(max_length=200, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]


class AircraftMaintenanceInterval(models.Model):
    INTERVAL_TYPE_CHOICES = [
        ("hours", "Hours"),
        ("days", "Days"),
        ("both", "Both"),
    ]

    aircraft = models.ForeignKey(
        Aircraft, on_delete=models.CASCADE, related_name="maintenance_intervals"
    )
    name = models.CharField(max_length=120)
    interval_type = models.CharField(
        max_length=20, choices=INTERVAL_TYPE_CHOICES, default="hours"
    )
    due_every_hours = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)
    due_every_days = models.PositiveIntegerField(null=True, blank=True)
    last_done_tach = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)
    last_done_hobbs = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)
    last_done_date = models.DateField(null=True, blank=True)
    is_ad = models.BooleanField(default=False)
    ad_number = models.CharField(max_length=80, blank=True, default="")
    ad_revision = models.CharField(max_length=40, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
