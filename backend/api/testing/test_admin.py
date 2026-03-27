import pytest
from django.contrib import admin
from django.core.checks import run_checks
from django.urls import reverse

from api.admin import CustomUserAdmin, MechanicInfoInline, PilotInfoInline
from api.models import Aircraft, Company, Flight, Inventory, Part, Profile


@pytest.mark.django_db
class TestAdminRegistry:
    def test_core_models_registered(self):
        registry = admin.site._registry

        assert Profile in registry
        assert Company in registry
        assert Aircraft in registry
        assert Part in registry
        assert Flight in registry
        assert Inventory in registry


@pytest.mark.django_db
class TestAdminPages:
    def test_admin_index_loads_for_superuser(self, client, test_admin):
        client.force_login(test_admin)

        response = client.get(reverse("admin:index"))

        assert response.status_code == 200

    def test_profile_changelist_loads_for_superuser(self, client, test_admin):
        client.force_login(test_admin)

        response = client.get(reverse("admin:api_profile_changelist"))

        assert response.status_code == 200

    def test_inventory_changelist_loads_for_superuser(self, client, test_admin):
        client.force_login(test_admin)

        response = client.get(reverse("admin:api_inventory_changelist"))

        # This should be 200 when admin config matches model fields.
        assert response.status_code == 200


@pytest.mark.django_db
class TestCustomUserAdminBehavior:
    def test_get_inlines_returns_pilot_inline_for_pilot(self, rf, sample_pilot_profile):
        user_admin = CustomUserAdmin(Profile, admin.site)
        request = rf.get("/admin/")

        inlines = user_admin.get_inlines(request, sample_pilot_profile)

        assert inlines == [PilotInfoInline]

    def test_get_inlines_returns_mechanic_inline_for_mechanic(self, rf, sample_user):
        user_admin = CustomUserAdmin(Profile, admin.site)
        request = rf.get("/admin/")

        inlines = user_admin.get_inlines(request, sample_user)

        assert inlines == [MechanicInfoInline]

    def test_get_inlines_returns_none_for_owner(self, rf, sample_profile):
        user_admin = CustomUserAdmin(Profile, admin.site)
        request = rf.get("/admin/")

        inlines = user_admin.get_inlines(request, sample_profile)

        assert inlines == []

    def test_profile_img_preview_without_image(self):
        user_admin = CustomUserAdmin(Profile, admin.site)
        profile = Profile(username="no-image")

        preview = user_admin.profile_img_preview(profile)

        assert preview == "(No image uploaded)"


@pytest.mark.django_db
class TestAdminConfigurationChecks:
    def test_admin_checks_pass_for_api_admin(self):
        errors = run_checks(tags=["admin"])

        api_admin_errors = [
            error
            for error in errors
            if getattr(error, "id", "").startswith("admin.")
            and "api.admin" in str(getattr(error, "obj", ""))
        ]

        assert api_admin_errors == []
