from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q

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
                for flight in aircraft.flights.all():
                    if flight.departure_time < end_date and flight.arrival_time > start_date:
                        clean = False
                        break
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

    def clean(self):
        super().clean()
        if self.company and self.employee_id:
            exists = Profile.objects.filter(company = self.company, employee_id = self.employee_id).exclude(pk=self.pk).exists()
            
            if exists:
                raise ValidationError({
                    'employee_id': f"Employee ID {self.employee_id} is already taken for this company."
                })
    
    def save(self, *args, **kwargs):
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
    registration_number = models.CharField(max_length=50)
    model = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200)
    engine_type = models.CharField(max_length=200, null= True)
    year_built = models.IntegerField(validators=[MaxValueValidator(9999),MinValueValidator(1903)])
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="aircraft", null=True, blank=True )
    
    def __str__(self):
        return f"{self.registration_number} ({self.model})"

#Part model, has basic information about the part and a str function. It is related to aircraft.
class Part(models.Model):
    part_number = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, blank= True)

    def __str__(self):
        return f"{self.part_number} - {self.name}"

#Inventory model, is to show the inventory of parts for the company, points to company and part. Has a function(low_stock) to show the if the stock is lower than the stock alert percentage.
class Inventory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name= "inventories")
    parts = models.ManyToManyField(Part, blank=True, through='InventoryPart', related_name="inventories")

    def __str__(self):
        items =self.inventorypart_set.all()
        if not items:
            return f"Inventory for {self.company.name} with no parts"
        return ",".join([f"{item.part.name} (Qty: {item.quantity})" for item in items])

#sub model for inventory to have a list of parts and their quantities, since inventory can have multiple parts and parts can be in multiple inventories.
class InventoryPart(models.Model):
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    stock_alert = models.PositiveIntegerField(default=0, help_text="Number where stock needs to be reordered")
    stock_alert_percentage = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(1)], default= .10, help_text="What percentile low stock warning shows up")
    shop_location = models.CharField(max_length=100, blank= True, null= True)

    def low_stock(self):
        """
        Consider this item low stock when current quantity is less than
        or equal to the alert threshold.
        """
        if self.quantity is None or self.stock_alert is None:
            return False
        return self.quantity <= self.stock_alert

    low_stock.boolean = True
    low_stock.short_description = "Low Stock?"
    def __str__(self):
        return f"{self.part.name} with {self.quantity} in stock"


class Flight(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, related_name="flights")
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, null=True, related_name="flights")
    flight_number = models.CharField(max_length=250, null=True)
    origin = models.CharField(max_length=250, null=True)
    destination = models.CharField(max_length=250, null=True)
    departure_time = models.DateTimeField(null=True)
    arrival_time = models.DateTimeField(null=True)
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
        related_name="primary_pilot",
    )
    secondary_pilot = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
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
    status = models.CharField(max_length=255, choices=status_type_options, default="pending approval")

    def clean(self):
        errors = {}

        if self.primary_pilot and self.secondary_pilot and self.primary_pilot == self.secondary_pilot:
            errors["secondary_pilot"] = (
                "Secondary pilot cannot be the same person as Primary pilot!"
            )

        if not self.departure_time:
            errors["departure_time"] = "Departure time does not exist"

        if not self.arrival_time:
            errors["arrival_time"] = "Arrival time does not exist"
        elif self.departure_time and self.arrival_time < self.departure_time:
            errors["arrival_time"] = "Arrival time can not be before departure time."

        def check_pilot(pilot, which_pilot):
            if not pilot:
                return
            if getattr(pilot, "company_role", None) != "pilot":
                errors[which_pilot] = f"{getattr(pilot, 'first_name', 'Pilot')} is not a pilot"
                return
            if getattr(pilot, "company", None) != self.company:
                errors[which_pilot] = f"{getattr(pilot, 'first_name', 'Pilot')} is not of company {self.company}"
                return
            pilot_info = getattr(pilot, "pilot_info", None)
            if not pilot_info:
                errors[which_pilot] = f"{getattr(pilot, 'first_name', 'Pilot')} is missing pilot_info"
                return
            if (
                not getattr(pilot_info, "medically_cleared_until", None)
                or (self.arrival_time and pilot_info.medically_cleared_until < self.arrival_time.date())
            ):
                errors[which_pilot] = (
                    f"{getattr(pilot, 'first_name', 'Pilot')} is not cleared to fly until {self.arrival_time.date() if self.arrival_time else 'N/A'}"
                )
            if hasattr(pilot_info, "is_certified") and not pilot_info.is_certified(self.pilot_requirement):
                errors[which_pilot] = f"{getattr(pilot, 'first_name', 'Pilot')} is not a high enough certification"

        check_pilot(self.primary_pilot, "primary_pilot")
        check_pilot(self.secondary_pilot, "secondary_pilot")

        if errors:
            raise ValidationError(errors)


class WorkOrder(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("awaiting_parts", "Awaiting Parts"),
        ("closed", "Closed"),
    ]

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

    def __str__(self):
        return f"Work Order #{self.id} - {self.aircraft.registration_number}"


class WorkOrderPart(models.Model):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()


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
