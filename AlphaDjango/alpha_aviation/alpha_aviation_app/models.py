from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# Create your models here.
class Company(models.Model):
    name = models.CharField(max_length=200)

    def add_associates(self, newassociate):
        if not isinstance(newassociate, worker):
            raise TypeError("New associate not part of type: Worker")
        newassociate.company = self

    def add_aircraft(self, newaircraft):
        if not isinstance(newaircraft, Aircraft):
            raise TypeError("New aircraft is not of type: Aircraft")
        newaircraft.company = self
    def __str__(self):
        return f"{self.name}"

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

class Worker(models.Model):
    Job_choices = [("admin", "Admin"),
                   ("mechanic", "Mechanic"),
                   ("pilot", "Pilot")]
    first_name = models.CharField(max_length=200)
    last_name = models.CharField(max_length=200)
    employee_ID = models.IntegerField()
    role = models.CharField(max_length= 200, choices=Job_choices)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, related_name="Workers", null=True, blank=True)

    def __str__(self):
        if self.role is not None and self.company is not None:
            return f"{self.first_name} {self.last_name}, {self.role} at {self.company}"
        else:
            return f"{self.first_name} {self.last_name}"