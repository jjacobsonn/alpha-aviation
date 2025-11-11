from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.contrib.auth.models import AbstractUser

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
  ]
  company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="Users", null=True, blank=True)
  companyRole = models.CharField(max_length= 255, choices=roleChoices, default='pilot' )
  



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


