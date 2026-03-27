# Backend API Testing

This folder contains the backend API test suite for the app. The tests are currently organized into model fixtures, model unit tests, integration-style model tests, seed command tests, and view endpoint tests.

## Current Test Suite Overview

### Test Modules

- `conftest.py`
  - Central pytest fixtures used across the suite.
  - Model fixtures are named with the `sample_` prefix (for example: `sample_profile`, `sample_flight`, `sample_inventory_part`).

- `test_models.py`
  - Unit tests for each model in `api/models.py`.
  - Focuses on model creation, relationships, helper methods, and string representations.

- `test_model_integration.py`
  - Cross-model integrity tests.
  - Focuses on model-to-model behavior and company aggregation methods (dashboard, inventory/workorder/discrepancy data, availability, and flight validation).

- `test_seed.py`
  - Tests for the `seed` management command.
  - Verifies seeded object counts, relationships, and expected seeded values.

- `test_views.py`
  - Endpoint-level tests for function views and DRF viewsets.
  - Includes authentication behavior, role-based access behavior, and expected endpoint status codes.
  - Intentionally asserts ideal endpoint behavior for several routes that are currently broken (see temporary section below).

- `test_admin.py`
	- Focused admin dashboard tests.
	- Verifies model registration, superuser access to key admin pages, custom `CustomUserAdmin` inline behavior by role, and admin system checks.
	- Includes guard tests that catch admin/model field drift.

### Test Configuration Notes

- Tests run with pytest + pytest-django.
- Test settings use `config.settings_test`.
- Tests run with `--nomigrations` to avoid current migration graph conflicts.

## Running Tests

> First, navigate to the `backend` directory.

Run all tests in this folder:

```bash
python -m pytest api/testing -q
```

Run only views tests:

```bash
python -m pytest api/testing/test_views.py -q
```

Run only admin tests:

```bash
python -m pytest api/testing/test_admin.py -q
```

## Temporary: Known Failing View Tests (Expected for Now)

The following tests currently fail because they assert the *desired* behavior, while the implementation still has mismatches/bugs:

1. `TestCompanyFunctionViews::test_available_aircraft_missing_dates`
	- Expected: HTTP 400 for missing query params.
	- Current behavior: HTTP 500 (`parse_datetime(None)` TypeError).

2. `TestCompanyFunctionViews::test_flight_calendar_missing_dates`
	- Expected: HTTP 400 for missing query params.
	- Current behavior: HTTP 500 (`parse_date(None)` TypeError).

3. `TestCompanyFunctionViews::test_flight_calendar_success`
	- Expected: HTTP 200.
	- Current behavior: HTTP 500 from `FlightSerializer` field mismatch (`approved` vs `status`).

4. `TestCompanyFunctionViews::test_company_flights_success`
	- Expected: HTTP 200.
	- Current behavior: HTTP 500 from `FlightSerializer` field mismatch (`approved` vs `status`).

5. `TestCompanyFunctionViews::test_company_inventory_detailed_success`
	- Expected: HTTP 200.
	- Current behavior: HTTP 500 from inventory queryset mismatch (`part` on `Inventory` instead of through model relation).

6. `TestViewSetEndpoints::test_profiles_list_authenticated`
	- Expected: HTTP 200.
	- Current behavior: HTTP 500 from `ProfileSerializer` field mismatch (`medically_cleared_until` not on `Profile`).

7. `TestViewSetEndpoints::test_flights_list_owner_success`
	- Expected: HTTP 200.
	- Current behavior: HTTP 500 from `FlightSerializer` field mismatch (`approved` vs `status`).

8. `TestViewSetEndpoints::test_inventories_list_mechanic_success`
	- Expected: HTTP 200.
	- Current behavior: HTTP 500 from inventory queryset mismatch (`select_related("part")` on `Inventory`).

When these implementation issues are fixed, the tests above should pass without needing test changes.

## Temporary: Known Failing Admin Tests (Expected for Now)

The following admin tests currently fail because they assert ideal admin behavior, while `api/admin.py` still references stale Inventory fields:

1. `TestAdminPages::test_inventory_changelist_loads_for_superuser`
	- Expected: HTTP 200 for inventory admin changelist page.
	- Current behavior: page crashes with `AttributeError` because `InventoryAdmin.list_display` references `part` (and related fields) that do not exist on `Inventory`.

2. `TestAdminConfigurationChecks::test_admin_checks_pass_for_api_admin`
	- Expected: no admin system-check errors.
	- Current behavior: fails with multiple admin check errors (`admin.E108`, `admin.E035`, `admin.E037`) for stale `InventoryAdmin` and `InventoryInline` field references.

When `api/admin.py` is aligned to the current `Inventory`/`InventoryPart` model structure, these admin tests should pass without test changes.