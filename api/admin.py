from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import Profile, Company, Aircraft, Part, Pilot, Mechanic, Inventory, Flight
from django.utils.html import format_html
# Register your models here.

class AircraftInline(admin.TabularInline):
    model = Aircraft
    extra = 1

@admin.register(Aircraft)
class AircraftAdmin(admin.ModelAdmin):
      search_fields = ["registration_number", "model"]


class CustomUserAdmin(UserAdmin):
      
      inlines = []
      readonly_fields = ("profile_img_preview",)
      fieldsets = (
            ('Personal info', {'fields': ('first_name', 'middle_name', 'last_name', 'profile_img', 'profile_img_preview')}),
            ('Company Info', {'fields': ('company', 'phone_number', 'email', 'employee_id', 'company_role')}),
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
      def get_inlines(self, request, obj):
            if not obj:
                  return []
            if obj.company_role == "pilot":
                  return [PilotInfoInline]
            if obj.company_role == "mechanic":
                  return[MechanicInfoInline]
            return []
      def profile_img_preview(self, obj):
            if obj.profile_img:
                  return format_html(
                        '<img src ="{}" style = "max-height: 200px; border: 1px solid #ccc;" />', 
                        obj.profile_img.url
                  )
            return "(No image uploaded)"
      def get_inline_instances(self, request, obj = ...):
            return [inline(self.model, self.admin_site) for inline in self.get_inlines(request, obj)]


class PilotInfoInline(admin.StackedInline):
    model = Pilot
    extra = 0
    can_delete = False


class MechanicInfoInline(admin.StackedInline):
      model = Mechanic
      extra = 0
      can_delete = False
      def clear_expired_medical_dates():
            Profile.objects.filter(medically_cleared_until__lt = timezone.now().date()).update(medically_cleared_until=None)


class PartInline(admin.TabularInline):
      model = Part
      extra = 0


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
      search_fields = ["part_number", "name"]


class InventoryInline(admin.TabularInline):
      model = Inventory
      extra = 0
      readonly_fields =("low_stock",)
      fields = ("part", "in_stock", "last_inspected", "inspection_due_in", "stock_alert", "shop_location", "low_stock")
      autocomplete_fields = ["part"]


class FlightAdmin(admin.ModelAdmin):
    fields = ['company', 'aircraft', 'origin', 'destination', 'departure_time', 'arrival_time']

class FlightInline(admin.TabularInline):
      model = Flight
      extra = 0
      fields = ("aircraft", "flight_number", "origin", "destination", "departure_time", "arrival_time", "route", "flight_type")
      autocomplete_fields = ["aircraft"]

class CompanyAdmin(admin.ModelAdmin):
        inlines = [AircraftInline, InventoryInline, FlightInline]



admin.site.register(Profile, CustomUserAdmin)
admin.site.register(Company, CompanyAdmin)

