from django.contrib import admin
from .models import Profile, Company, Aircraft, Part
# Register your models here.

admin.site.register(Profile)
admin.site.register(Company)
admin.site.register(Aircraft)
admin.site.register(Part)
