from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import Profile, Company, Aircraft, Part, pilot_info, mechanic_info
from django.utils.html import format_html
# Register your models here.

class AircraftInline(admin.TabularInline):
    model = Aircraft
    extra = 1


class CompanyAdmin(admin.ModelAdmin):
        inlines = [AircraftInline]

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
      """def get_fieldsets(self, request, obj = None):
            fieldsets = super().get_fieldsets(request, obj)
            fieldsets = list(fieldsets)

            if obj and obj.company_role == "pilot":
                  fieldsets.insert(2, ("Pilot Info", {"fields":()}))
            elif obj and obj.company_role == "mechanic_info":
                  fieldsets.insert(2, ("Mechanic Info", {"fields": ()}))
            return fieldsets"""
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
    model = pilot_info
    extra = 0
    can_delete = False

class MechanicInfoInline(admin.StackedInline):
    model = mechanic_info
    extra = 0
    can_delete = False
def clear_expired_medical_dates():
      Profile.objects.filter(medically_cleared_until__lt = timezone.now().date()).update(medically_cleared_until=None)

admin.site.register(Profile, CustomUserAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Aircraft)
admin.site.register(Part)
