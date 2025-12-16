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

    def is_mechanic(self):
        return self.company_role == "mechanic"
    

    def is_pilot(self):
        return self.company_role == "pilot"
    
    def is_cleared_to_fly(self): 
        if self.company_role == 'pilot' and self.Pilot.medically_cleared_until and self.Pilot.medically_cleared_until > timezone.now().date() and self.Pilot.pilot_certificate != 'none': #change
            return True
        else:
            return False 
        
    def is_certified(self, reqRole):
        if self.Pilot.pilot_certificate == 'none':
            pilotNum = 0
        elif self.Pilot.pilot_certificate == 'student':
            pilotNum = 1
        elif self.Pilot.pilot_certificate == 'private':
            pilotNum = 2
        elif self.Pilot.pilot_certificate == 'commercial':
            pilotNum = 3
        elif self.Pilot.pilot_certificate == 'airline':
            pilotNum = 4
        if type(reqRole) == int:
            reqNum = reqRole
        else:
            if reqRole == 'none':
                reqNum = 0
            elif reqRole == 'student':
                reqNum = 1
            elif reqRole == 'private':
                reqNum = 2
            elif reqRole == 'commercial':
                reqNum = 3
            elif reqRole == 'airline':
                reqNum = 4
        return pilotNum >= reqNum


    
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
    
    @admin.display(boolean=True, description="Low Stock?")
    def low_stock(self):
        if self.stock_alert>= self.in_stock * (1+self.stock_alert_percentage) or self.stock_alert >= self.in_stock -1:
            return True
        else:
            return False

    def __str__(self):
        return f"{self.part.name} with {self.in_stock} in stock"

class Flight(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null = True)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, null = True)
    flight_number = models.CharField(max_length= 250, null = True)
    origin = models.CharField(max_length= 250, null = True)
    destination = models.CharField(max_length=250, null = True)
    departure_time = models.DateField(null = True)
    arrival_time = models.DateField(null = True)
    route = models.CharField(blank= True, null= True)
    flight_type_options = [
        ('training', 'Training'),
        ('charter', 'Charter'),
        ('positioning', 'Positioning'),
        ('maintenance ferry', 'Maintenance Ferry'),
    ]
    flight_type = models.CharField(max_length= 255, choices=flight_type_options, default='pilot' )
