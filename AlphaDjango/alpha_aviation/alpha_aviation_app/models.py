from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# Create your models here.
class Aircraft(models.Model):
    registration_number = models.IntegerField(max_length=200)
    model = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200)
    year_built = models.IntegerField(validators=[MaxValueValidator(9999),MinValueValidator(1903)])
    def __str__(self):
        return self.objects.all()

