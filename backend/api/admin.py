from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import *
from django.utils.html import format_html
from django.forms import BaseInlineFormSet
#Admin display for discrepancies
class DiscrepancyAdmin(admin.ModelAdmin):
    list_display = ('id', 'aircraft', 'status', 'date_reported', 'reporter')
    list_filter = ('status', 'aircraft')
    search_fields = ('description', 'ata_code', 'component_affected')

#Inline display used when refrenced on other page for discrepancies
class DiscrepancyInline(admin.TabularInline):
      model = Discrepancy
      extra = 0
      fields = ('id', 'aircraft', 'status', 'description')

#Inline display used when refrenced on other page for workorder parts
class WorkOrderPartInline(admin.TabularInline):
      model = WorkOrderPart
      extra = 1

#Inline display used when refrenced on other page for flights
class FlightInline(admin.TabularInline):
      model = Flight
      extra = 0
      fields = ("aircraft", "company", "flight_number", "primary_pilot", "secondary_pilot", "origin", "destination", "departure_time", "arrival_time", "pilot_requirement", "route", "flight_type")
      autocomplete_fields = ["aircraft"]
      def formfield_for_foreignkey(self, db_field, request, **kwargs):
            if db_field.name in  ("primary_pilot", "secondary_pilot"):
                  kwargs["queryset"] = Profile.objects.filter(company__isnull = False, company_role = "pilot")
            return super().formfield_for_foreignkey(db_field, request, **kwargs)


#Admin display for Work orders
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'aircraft', 'status', 'created_by', 'created_at', 'due_by', 'tach_time', 'hobbs_time', 'ATA_code', 'components_affected', 'signed_by', 'signature_date', 'signature')
    list_filter = ('status', 'aircraft')
    inlines = [WorkOrderPartInline]
    search_fields = ('title', 'description')

#Inline display used when refrenced on other page for workorders
class WorkOrderInline(admin.TabularInline):
      model = WorkOrder
      extra = 0
      fields = ('id', 'aircraft', 'status', 'description')

class AircraftPartFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        for form in self.forms:
            if form.cleaned_data and not form.cleaned_data.get('DELETE', False):
                instance = form.instance
                instance.aircraft = self.instance
                instance.expiration_hobbs = form.cleaned_data.get('expiration_hobbs')
                instance.expiration_date = form.cleaned_data.get('expiration_date')
                instance.part = form.cleaned_data.get('part')
                try:
                    instance.clean()
                except ValidationError as e:
                    form.add_error(None, e)

class AircraftPartInline(admin.TabularInline):
    model = AircraftPart
    formset = AircraftPartFormSet
    extra = 1
    fields = ('part', 'expiration_date', 'expiration_hobbs')

class AircraftPartAdmin(admin.ModelAdmin):
    list_display = ('aircraft', 'part', 'expiration_date', 'expiration_hobbs')
    search_fields = ('aircraft__registration_number', 'part__name')

#Inline display used when refrenced on other page for aircrafts
class AircraftInline(admin.TabularInline):
    model = Aircraft
    extra = 1
    inlines = [WorkOrderInline, DiscrepancyInline]

#Admin display for Aircrafts
class AircraftAdmin(admin.ModelAdmin):
      inlines = [WorkOrderInline, DiscrepancyInline, AircraftPartInline, FlightInline]
      search_fields = ["registration_number", "model"]

#Admin display for users/profiles
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

      #Function to see if user is pilot or mechanic and then adds inlines for those specific roles
      def get_inlines(self, request, obj):
            if not obj:
                  return []
            if obj.company_role == "pilot":
                  return [PilotInfoInline]
            if obj.company_role == "mechanic":
                  return[MechanicInfoInline]
            return []

      # Function to show image
      def profile_img_preview(self, obj):
            if obj.profile_img:
                  return format_html(
                        '<img src ="{}" style = "max-height: 200px; border: 1px solid #ccc;" />', 
                        obj.profile_img.url
                  )
            return "(No image uploaded)"

      #gets inline for profiles
      def get_inline_instances(self, request, obj = ...):
            return [inline(self.model, self.admin_site) for inline in self.get_inlines(request, obj)]

#Inline display used when refrenced on other page for users
class UserInline(admin.TabularInline):
      model = Profile
      fields = ('first_name', 'middle_name', 'last_name', 'profile_img', 'phone_number', 'email', 'employee_id', 'company_role', 'last_login', 'date_joined')
      readonly_fields = ('first_name', 'middle_name', 'last_name', 'phone_number', 'email', 'last_login', 'date_joined')
      extra = 0

#Inline display used when refrenced on other page for  pilots
class PilotInfoInline(admin.StackedInline):
    model = Pilot
    extra = 0
    can_delete = False

#Inline display used when refrenced on other page for mechanics
class MechanicInfoInline(admin.StackedInline):
      model = Mechanic
      extra = 0
      can_delete = False
      def clear_expired_medical_dates():
            Profile.objects.filter(medically_cleared_until__lt = timezone.now().date()).update(medically_cleared_until=None)

#Inline display used when refrenced on other page for parts
class PartInline(admin.TabularInline):
      model = Part
      extra = 0

#Admin display for parts
class PartAdmin(admin.ModelAdmin):
      search_fields = ["part_number", "name"]

#Inline display used when refrenced on other page for inventory parts
class InventoryPartInline(admin.TabularInline):
      model = InventoryPart
      extra = 1

#Admin display for inventories
class InventoryAdmin(admin.ModelAdmin):
      search_fields = ["shop_location"]
      inlines = [InventoryPartInline]

#Inline display used when refrenced on other page for inventories
class InventoryInline(admin.TabularInline):
      model = Inventory
      extra = 0

#Admin display for flights
class FlightAdmin(admin.ModelAdmin):
    fields = ['company', 'aircraft', 'primary_pilot', "secondary_pilot", 'origin', 'destination', 'departure_time', 'arrival_time']
    search_fields = ['aircraft__registration_number', 'aircraft__model', 'origin', 'destination']
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
          if db_field.name == "primary_pilot":
                kwargs["queryset"] = Profile.objects.filter(company__isnull = False, company_role = "pilot")
          return super().formfield_for_foreignkey(db_field, request, **kwargs)

#Admin display for the company
class CompanyAdmin(admin.ModelAdmin):
      inlines = [UserInline, AircraftInline, InventoryInline, FlightInline]

#function to see if medical dates expire before today and then clear them
def clear_expired_medical_dates():
      Profile.objects.filter(medically_cleared_until__lt = timezone.now().date()).update(medically_cleared_until=None)

#register all of the admin pages
admin.site.register(Profile, CustomUserAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Aircraft, AircraftAdmin)
admin.site.register(AircraftPart, AircraftPartAdmin)
admin.site.register(Part, PartAdmin)
admin.site.register(Inventory, InventoryAdmin)
admin.site.register(Flight, FlightAdmin)
admin.site.register(Discrepancy, DiscrepancyAdmin)
admin.site.register(WorkOrder, WorkOrderAdmin)
