from django.contrib import admin

from .models import Aircraft, Part, Company, Worker

class WorkerInline(admin.TabularInline):
    model = Worker
    extra = 1

class AircraftInline(admin.TabularInline):
    model= Aircraft
    extra = 1

class CompanyAdmin(admin.ModelAdmin):
    inlines = [WorkerInline, AircraftInline]

# Register your models here.
admin.site.register(Aircraft)
admin.site.register(Part)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Worker)


