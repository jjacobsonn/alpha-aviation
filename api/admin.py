from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Profile, Company, Aircraft, Part
# Register your models here.

class AircraftInline(admin.TabularInline):
    model = Aircraft
    extra = 1

class ProfileInline(admin.TabularInline):
      model = Profile
      fields  =('company', 'companyRole', 'username', 'first_name', 'last_name') 
      extra = 1
      show_change_link = True

class CompanyAdmin(admin.ModelAdmin):
        inlines = [AircraftInline, ProfileInline]

class CustomUserAdmin(UserAdmin):
      fieldsets = UserAdmin.fieldsets + (
            ('Additional Info', {'fields':('company', 'companyRole')}),
      )
      add_fieldsets = UserAdmin.add_fieldsets +(
            ('Additional Info', {'fields':('company', 'companyRole')}),
      )

admin.site.register(Profile, CustomUserAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Aircraft)
admin.site.register(Part)
