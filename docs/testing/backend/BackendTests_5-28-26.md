# Backend QA Report 5/28/2026
-----
Test summary
-----
- Scope and organization: `test_views.py` covers public auth endpoints, authenticated-user endpoints, company-scoped function endpoints, viewset CRUD behaviors, and fleet endpoints. Tests are grouped to assert both authorization (401/403) and expected successful responses (200/201), plus response shapes (lists vs objects).
- Representative endpoint coverage:
  - Public/auth: `health`, `login`, `token_refresh` (success, missing fields, and invalid credentials).
  - Authenticated user: `user_profile`, `logout` (auth required and success cases).
  - Company functions: `aircraft-availability`, `flight-calendar`, `management-dashboard`, and company-scoped lists for users, inventory, aircraft, flights, workorders, and discrepancies.
  - ViewSets: list/detail/create flows are exercised for companies, profiles, aircraft, parts, discrepancies, workorders, flights, inventories, and tools.
- Testing patterns used:
  - Role fixtures (`sample_user`, `sample_profile`, `owner_client`) validate manager/owner/mechanic/pilot permission boundaries.
  - Edge-case tests intentionally set `authenticated_client.raise_request_exception = False` so that server exceptions convert into HTTP responses for assertion.
- Recent bug & fix:
  - Symptom: Requests missing `start_date`/`end_date` previously triggered a 500 server error when the code passed `None` into `parse_datetime()`/`parse_date()` (which internally calls `fromisoformat` expecting a string).
  - Cause: Unconditional parsing of `request.GET` values without checking for `None` or empty strings.
  - Fix: Guarded parser calls to only run when the query param is present and non-empty. Views now return the intended 400 Bad Request for missing date params.
- Recommendation: add explicit tests for invalid formats (non-ISO strings) and reversed ranges (start > end) to prevent regressions and centralize query-param validation in a shared helper or serializer.
-----
Current failing tests
-----
  - `TestAdminRegistry.test_core_models_registered` — failing because the `Inventory` model is not registered in the Django admin site.
  - `TestAdminPages.test_inventory_changelist_loads_for_superuser` — failing for the same reason.
  - Check `backend/api/admin.py` to confirm whether `Inventory` (or `InventoryPart`) should be registered
-----
New tests added
-----
- Serializer tests: add unit tests for key serializers (Profile, Flight, Inventory) covering valid/invalid serialization and deserialization.
- Permission matrix tests: unit tests of each permission class (`IsCompanyMember`, `HasCompanyRole`, `IsOwner`, `IsManagerOrOwner`, `IsMechanicOrManager`, `IsOwnProfileOrManager`) validating allow/deny for role combos.
- Viewset CRUD integration: expand list/create/update/delete tests per resource (Flights, Inventories, WorkOrders, Parts), with role-based access checks and payload validation.
- Company function edge cases: explicit tests for `available_aircraft` and `flight_calendar` (missing/invalid dates, reversed ranges, invalid `aircraft_id`).
- Inventory integration: create inventory and `InventoryPart` lifecycle tests, low-stock threshold transitions, and company scoping.
- Authentication expansions: token refresh invalid/expired handling, logout blacklist behavior, and protected endpoint access across roles.
- Model validation branches: tests for Profile transitions, Flight validation (arrival before departure, pilot company mismatch), and InventoryPart boundary conditions.
- Admin integration: ensure key models (Inventory/InventoryPart) register in admin and changelist/add pages load for superusers.
- Seed command: re-run seed and assert deterministic data counts and critical relationships.
- Query/performance guards: add N+1 query checks on heavy list endpoints and basic pagination/sorting assertions.

