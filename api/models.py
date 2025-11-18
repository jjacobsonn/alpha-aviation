from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone


class Company(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    

    def __str__(self):
        return self.name

class Profile(AbstractUser):
    roleChoices = [
        ('owner', 'Owner'),
        ('mechanic', 'Mechanic'),
        ('pilot', 'Pilot'),
        ('manager', 'Manager'),
    ]
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="Users", null=True, blank=True)
    company_role = models.CharField(max_length= 255, choices=roleChoices, default='pilot' )
    middle_name = models.CharField(max_length=150, blank=True, null=True)
    employee_id = models.PositiveIntegerField(null=True, blank=True)
    phone_number = models.CharField(max_length=10, blank=True, null=True, help_text="Numbers only, do not add \"(\", \")\" or \"-\" ")

    #Pilot only
    medically_cleared_until = models.DateField(null=True, blank=True)
    certificates = [
        ('none', 'None'),
        ('student', 'Student'),
        ('private', 'Private'),
        ('commercial', 'Commercial'),
        ('airline', 'Airline'),
    ]
    pilot_certificate = models.CharField(max_length= 255, choices=certificates, default= 'None')

    #Mechanic only
    AP_certificate_number = models.PositiveIntegerField(blank=True, null=True)



    def clean(self):
        super().clean()
        if self.company and self.employee_id:
            exists = Profile.objects.filter(company = self.company, employee_id = self.employee_id).exclude(pk=self.pk).exists()
            
            if exists:
                raise ValidationError({
                    'employee_id': f"Employee ID {self.employee_id} is already taken for this company."
                })
    
    def save(self, *args, **kwargs):
        if self.medically_cleared_until and self.medically_cleared_until < timezone.now().date():
            self.medically_cleared_until = None
        super().save(*args, **kwargs)
    #Helper functions
    #mechanic
    def is_mechanic(self):
        return self.company_role == "mechanic"
    
    #Pilot
    def is_pilot(self):
        return self.company_role == "pilot"
    
    def is_cleared_to_fly(self):
        if self.company_role == 'pilot':
            if self.medically_cleared_until and self.medically_cleared_until > timezone.now().date():
                if self.pilot_certificate != 'none':
                    return True
                else:
                    return False #pilot certificate failed
            else:
                return False #medically cleared failed
        else:
            return False
    
    def get_cert_num(role):
        if role == 'none':
            return 0
        elif role == 'student':
            return 1
        elif role == 'private':
            return 2
        elif role == 'commercial':
            return 3
        elif role == 'airline':
            return 4
        
    def is_certified(self, reqRole):
        pilotNum = self.get_cert_num(self.pilot_certificate)
        reqNum = self.get_cert_num(reqRole)
        return pilotNum >= reqNum


    #owner
    def is_owner(self):
        return self.company_role == "owner"
    
    #manager
    def is_manager(self):
        return self.company_role == 'manager'
    
    

  



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
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE)
    in_stock = models.PositiveIntegerField(default=0)
    last_inspected = models.DateField(null= True)


