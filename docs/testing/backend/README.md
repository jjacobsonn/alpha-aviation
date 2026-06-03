# Backend API Testing

Pytest suite for the backend API. **Test modules** live in `backend/api/testing/`; this document describes the suite.

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

- `test_serializers.py`
  - Unit tests for each serializer (Profile, Flight, Inventory, etc.) including serialization and deserialization, required fields, and invalid payload handling.
  
- `test_permissions.py`
  - Unit tests for permission classes (`IsCompanyMember`, `HasCompanyRole`, `IsOwner`, `IsManagerOrOwner`, `IsMechanicOrManager`, `IsOwnProfileOrManager`) covering allow/deny matrices across roles and platform-admin behavior.

- `test_views_crud.py`
  - Focused CRUD integration tests for viewsets: list/create/update/delete for Flights, Inventories, WorkOrders, Parts, with role-based access checks and payload validation.

- `test_views_edge_cases.py`
  - Edge-case and validation tests for function views (e.g., `available_aircraft`, `flight_calendar`): missing/invalid dates, reversed ranges, invalid `aircraft_id`, and response shape consistency.

- `test_inventory_integration.py`
  - Full inventory lifecycle tests: create Inventory, add `InventoryPart` rows, quantity updates, low-stock transitions, and company scoping/isolation.

- `test_auth_integration.py`
  - Expanded auth tests: token refresh invalid/expired handling, logout blacklist flow, and access patterns across roles.

- `test_admin_integration.py`
  - Deeper admin page checks: ensure key models are registered, changelist and add/change pages load for superusers, and important admin inlines and search fields work.

- `test_queries.py`
  - Optional regression guards for N+1 queries and heavy-list endpoint performance characteristics (query counts, select_related/prefetch coverage).

### Test Configuration Notes

- Tests run with pytest + pytest-django.
- Test settings use `config.settings_test`.
- Tests run with `--nomigrations` to avoid current migration graph conflicts.

## Running Tests

> Run commands from the `backend` directory. Test files: `backend/api/testing/`.

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
