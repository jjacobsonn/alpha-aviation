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
