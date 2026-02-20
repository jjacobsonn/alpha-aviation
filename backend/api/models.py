from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone



class Company(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    locations =models.CharField(null=True, blank=True)
    

    def __str__(self):
        return self.name

class Profile(AbstractUser):
    role_choices = [
        ('owner', 'Owner'),
        ('mechanic', 'Mechanic'),
        ('pilot', 'Pilot'),
        ('manager', 'Manager'),
    ]
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="Users", null=True, blank=True)
    company_role = models.CharField(max_length= 255, choices=role_choices, default='pilot' )
    middle_name = models.CharField(max_length=150, blank=True, null=True)
    employee_id = models.PositiveIntegerField(null=True, blank=True)
    phone_number = models.CharField(max_length=10, blank=True, null=True, help_text="Numbers only, do not add \"(\", \")\" or \"-\" ")
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
    pilot_certificate = models.CharField(max_length= 255, choices=certificates, default= 'None')
    

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
        return levels[self.pilot_certificate] >= levels[required]

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


class Aircraft(models.Model):
    registration_number = models.IntegerField()
    model = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200)
    engine_type = models.CharField(max_length=200, null= True)
    year_built = models.IntegerField(validators=[MaxValueValidator(9999),MinValueValidator(1903)])
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="Aircraft", null=True, blank=True )
    
    def __str__(self):
        return f"{self.registration_number} ({self.model})"


class Part(models.Model):
    part_number = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, blank= True)

    def __str__(self):
        return f"{self.part_number} - {self.name}"
    

class Inventory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name= "inventories")
    part = models.ForeignKey(Part, on_delete=models.CASCADE)

    last_inspected = models.DateField(null= True)
    inspection_due_in = models.PositiveIntegerField(null= True, blank=True, help_text="Days")

    in_stock = models.PositiveIntegerField(default=0)
    stock_alert = models.PositiveIntegerField(default=0, help_text="Number where stock needs to be reordered")
    stock_alert_percentage = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(1)], default= .10, help_text="What percentile low stock warning shows up")
    shop_location = models.CharField(max_length=100, blank= True, null= True)
    
    def low_stock(self):
        return (
            self.stock_alert >= self.in_stock * (1 + self.stock_alert_percentage)
            or self.stock_alert >= self.in_stock - 1
        )

    low_stock.boolean = True
    low_stock.short_description = "Low Stock?"

    def __str__(self):
        return f"{self.part.name} with {self.in_stock} in stock"

class Flight(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null = True)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, null = True)
    flight_number = models.CharField(max_length= 250, null = True)
    origin = models.CharField(max_length= 250, null = True)
    destination = models.CharField(max_length=250, null = True)
    departure_time = models.DateTimeField(null = True)
    arrival_time = models.DateTimeField(null = True)
    route = models.CharField(blank= True, null= True)
    flight_type_options = [
        ('training', 'Training'),
        ('charter', 'Charter'),
        ('positioning', 'Positioning'),
        ('maintenance ferry', 'Maintenance Ferry'),
    ]
    flight_type = models.CharField(max_length= 255, choices=flight_type_options, default='training' )
    primary_pilot = models.ForeignKey(Profile, on_delete=models.CASCADE, null= True, related_name= "primary_flights")
    secondary_pilot = models.ForeignKey(Profile, on_delete=models.CASCADE, null= True, related_name= "secondary_flights")
    pilot_req_options =[
        ('student', 'Student'),#1
        ('private', 'Private'),#2
        ('commercial', 'Commercial'),#3
        ('airline', 'Airline'),#4
    ]
    pilot_requirement = models.CharField(max_length= 255, choices=pilot_req_options, default = "private")
    approved = models.BooleanField(default=False)


    def clean(self):
        errors = {}
        
        if self.primary_pilot and self.secondary_pilot:
            if self.primary_pilot == self.secondary_pilot:
                errors["secondary_pilot"] = ("Secondary pilot cannot be the same person as Primary pilot!") 
        if not self.departure_time:
            errors["departure_time"] = ("Departure time does not exist")

        if not self.arrival_time:
            errors["arrival_time"] = ("Arrival time does not exist")
            
        elif self.arrival_time < self.departure_time:
            errors["arrival_time"] = ("Arrival time can not be before departure time.")
        
        def check_pilot(pilot, which_pilot):
            if not pilot:
                return
            if pilot.company_role != "pilot":
                errors[which_pilot] = (f"{pilot.first_name} is not a pilot")
                return
            
            if pilot.company != self.company:
                errors[which_pilot] = (f"{pilot.first_name} is not of company {self.company}")
                return
            if not hasattr(pilot, "pilot_info"):
                errors[which_pilot] = (f"{pilot.first_name} does not have attribute \'pilot_info\'")
                return
            if not pilot.pilot_info.medically_cleared_until or pilot.pilot_info.medically_cleared_until < self.arrival_time.date():
                errors[which_pilot] = (f"{pilot.first_name} is not cleared to fly until {self.arrival_time.date()}")
            if not pilot.pilot_info.is_certified(self.pilot_requirement):
                errors[which_pilot] = (f"{pilot.first_name} is not a high enough certification")
        check_pilot(self.primary_pilot, "primary_pilot")
        check_pilot(self.secondary_pilot, "secondary_pilot")

        if errors:
            raise ValidationError(errors)
