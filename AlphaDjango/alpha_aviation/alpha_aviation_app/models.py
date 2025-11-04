from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# Create your models here.
class Aircraft(models.Model):
    registration_number = models.IntegerField(max_length=200)
    model = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200)
    engine_type = models.CharField(max_length=200, null= True)
    year_built = models.IntegerField(validators=[MaxValueValidator(9999),MinValueValidator(1903)])
    
    def __str__(self):
        return f"{self.registration_number} ({self.model})"
    
class Part(models.Model):
    part_number = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE)
    in_stock = models.PositiveIntegerField(default=0)
    last_inspected = models.DateField(null= True)

class Company(models.Model):
    name = models.CharField(max_length=200)
    associates = []

    def add_associates(self, newassociate):
        if not isinstance(newassociate, worker):
            raise TypeError("New associate not part of type: Worker")
        self.associates.append(newassociate)

class Worker(models.Model):
    Job_choices = [("admin", "Admin"),
                   ("mechanic", "Mechanic"),
                   ("pilot", "Pilot")]
    first_name = models.CharField(max_length=200)
    last_name = models.CharField(max_lenght=200)
    employee_ID = models.IntegerField(max_length=200)
    role = models.CharField(max_length= 200, choices=Job_choices)
