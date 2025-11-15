from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import Profile, Company, Aircraft, Part
# Register your models here.

class AircraftInline(admin.TabularInline):
    model = Aircraft
    extra = 1

class ProfileInline(admin.TabularInline):
      model = Profile
      fields  =('company', 'company_role', 'username', 'first_name', 'last_name', 'employee_id') 
      extra = 1
      show_change_link = True

class CompanyAdmin(admin.ModelAdmin):
        inlines = [AircraftInline, ProfileInline]

class CustomUserAdmin(UserAdmin):
      fieldsets = (
            ('Personal info', {'fields': ('first_name', 'middle_name', 'last_name', 'phone_number', 'email')}),
            ('Additional Info', {'fields': ('company', 'company_role', 'employee_id')}),
            ('Web Permissions', {'fields':('is_active', 'is_staff', 'is_superuser','groups', 'user_permissions')}),
            ('Important Dates', {'fields':('last_login', 'date_joined')}),
      )

      add_fieldsets = (
            (None, {
                  'classes': ('wide',),
                  'fields':('username', 'first_name', 'middle_name', 'last_name', 'email', 'password1', 'password2'),
            }
            ),
      )
      def get_fieldsets(self, request, obj=None):
            fieldsets = super().get_fieldsets(request, obj)
            fieldsets = list(fieldsets)
            
            #pilot additionals
            if obj and obj.company_role == 'pilot':
                  fields = list(fieldsets[1][1]['fields'])
                  fields.append('medically_cleared_until')
                  fields.append('pilot_certificate')
                  fieldsets[1] = ('Additional Info', {'fields': tuple(fields)})
            if obj and obj.company_role == 'mechanic':
                  fields = list(fieldsets[1][1]['fields'])
                  fields.append('AP_certificate_number')
                  fieldsets[1] = ('Additional Info', {'fields': tuple(fields)})
            

            return fieldsets
      
      def save_model(self, request, obj, form, change):
            if obj.company_role == 'pilot' and not obj.medically_cleared_until:
                  messages.warning(request, "Pilot does not have medically cleared date!")
            super().save_model(request, obj, form, change)

def clear_expired_medical_dates():
      Profile.objects.filter(medically_cleared_until__lt = timezone.now().date()).update(medically_cleared_until=None)

admin.site.register(Profile, CustomUserAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Aircraft)
admin.site.register(Part)
