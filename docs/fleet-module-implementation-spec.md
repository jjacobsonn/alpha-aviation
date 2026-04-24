# Fleet Module Implementation Spec (Next Build)

## Goal

Deliver a production-ready Fleet module that includes:

- Aircraft inventory directory with search/filter/sort
- Aircraft detail experience with specs, photos, and maintenance context
- Maintenance interval and AD compliance tracking
- Shared aircraft selector used consistently across modules
- Role-based behavior for admin, manager, pilot, mechanic, dispatcher

This spec is intentionally scoped so implementation can start immediately.

## Current Baseline (Already in Code)

- Backend already has company-scoped endpoints for aircraft, flights, work orders, discrepancies.
- Roles already exist: `owner`, `manager`, `mechanic`, `pilot`, `dispatcher`.
- Platform admins are represented by `is_staff` / `is_superuser`.
- Frontend already consumes company-scoped APIs and has role-aware routing.

## Phase 1 Scope (Build Next)

Phase 1 is the minimum complete deliverable aligned with client ask:

1. Fleet directory endpoint + page
2. Aircraft detail endpoint + page
3. Maintenance intervals data model + list/create/update/complete API
4. AD compliance tracked through interval records (`is_ad = true`)
5. Shared `AircraftSelector` UI component
6. RBAC enforcement for all of the above

## Data Model Changes

### 1) Extend `Aircraft`

Add fields to `backend/api/models.py` (`Aircraft`):

- `location = models.CharField(max_length=100, blank=True, default="")`
- `tach_current = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)`
- `hobbs_current = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)`
- `fleet_status = models.CharField(max_length=40, choices=[...], default="active")`
- `aircraft_type = models.CharField(max_length=60, blank=True, default="")`
- `specs = models.JSONField(default=dict, blank=True)`  
  (Phase 1 keeps this JSON for speed; normalize later if needed)

Recommended `fleet_status` choices:

- `active`
- `maintenance_due`
- `aog`
- `grounded`

### 2) New `AircraftPhoto`

Create related table:

- `aircraft = ForeignKey(Aircraft, related_name="photos", on_delete=models.CASCADE)`
- `image = models.ImageField(upload_to="aircraft_photos/")`
- `caption = models.CharField(max_length=200, blank=True, default="")`
- `sort_order = models.PositiveIntegerField(default=0)`

### 3) New `AircraftMaintenanceInterval`

Create table:

- `aircraft = ForeignKey(Aircraft, related_name="maintenance_intervals", on_delete=models.CASCADE)`
- `name = models.CharField(max_length=120)`  (e.g., "100 Hour", "Annual", "AD 2024-12-07")
- `interval_type = models.CharField(max_length=20, choices=[("hours","Hours"),("days","Days"),("both","Both")])`
- `due_every_hours = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)`
- `due_every_days = models.PositiveIntegerField(null=True, blank=True)`
- `last_done_tach = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)`
- `last_done_hobbs = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)`
- `last_done_date = models.DateField(null=True, blank=True)`
- `is_ad = models.BooleanField(default=False)`
- `ad_number = models.CharField(max_length=80, blank=True, default="")`
- `ad_revision = models.CharField(max_length=40, blank=True, default="")`
- `notes = models.TextField(blank=True, default="")`
- `is_active = models.BooleanField(default=True)`
- timestamps (`created_at`, `updated_at`)

Computed response fields (serializer methods, not DB columns):

- `hours_remaining`
- `days_remaining`
- `compliance_status` (`ok`, `due_soon`, `overdue`)
- `severity_color` (`green`, `amber`, `red`)

## API Contract (Phase 1)

Add under `backend/api/urls.py`:

- `GET /api/fleet/aircraft/`
- `GET /api/fleet/aircraft/<id>/`
- `GET /api/fleet/aircraft/<id>/intervals/`
- `POST /api/fleet/aircraft/<id>/intervals/`
- `PATCH /api/fleet/intervals/<interval_id>/`
- `POST /api/fleet/intervals/<interval_id>/complete/`

### 1) Fleet Directory

`GET /api/fleet/aircraft/`

Query params:

- `search` (tail/model/location)
- `status`
- `type`
- `location`
- `ordering` (`registration_number`, `model`, `location`, `fleet_status`, `-tach_current`)

Response item:

- `id`
- `registration_number`
- `model`
- `location`
- `tach_current`
- `hobbs_current`
- `fleet_status`
- `aircraft_type`
- `interval_summary`:
  - `overdue_count`
  - `due_soon_count`
  - `ok_count`

### 2) Aircraft Detail

`GET /api/fleet/aircraft/<id>/`

Response:

- aircraft base fields
- `specs`
- `photos[]`
- `links`:
  - `open_workorders_count`
  - `open_discrepancies_count`
  - `recent_flights_count`
  - optional top 5 IDs for deep-linking

### 3) Intervals List

`GET /api/fleet/aircraft/<id>/intervals/`

Response row:

- all editable interval fields
- computed fields:
  - `hours_remaining`
  - `days_remaining`
  - `compliance_status`
  - `severity_color`

### 4) Create Interval

`POST /api/fleet/aircraft/<id>/intervals/`

Request example:

```json
{
  "name": "100 Hour Inspection",
  "interval_type": "hours",
  "due_every_hours": 100,
  "last_done_tach": 1250.4,
  "is_ad": false,
  "notes": "Recurring interval"
}
```

### 5) Update Interval

`PATCH /api/fleet/intervals/<interval_id>/`

Partial update for configuration fields and notes.

### 6) Complete Interval

`POST /api/fleet/intervals/<interval_id>/complete/`

Request example:

```json
{
  "completed_date": "2026-04-21",
  "completed_tach": 1350.8,
  "completed_hobbs": 980.1,
  "notes": "Completed under WO-442"
}
```

Behavior:

- Overwrite `last_done_*` from completion payload.
- Keep same interval config (`due_every_*`) so next due computes automatically.

## RBAC Matrix (Enforcement Rules)

- `platform admin`: full read/write (with company context header support already in project)
- `owner` and `manager`: full read/write on fleet aircraft + intervals + photos/specs
- `mechanic`: read fleet, create/update/complete intervals, update AD-related records
- `dispatcher`: read-only fleet + interval statuses
- `pilot`: read-only fleet + interval statuses

## Backend Implementation Checklist

1. Add model fields/tables + migrations.
2. Add serializers:
   - `FleetAircraftListSerializer`
   - `FleetAircraftDetailSerializer`
   - `AircraftPhotoSerializer`
   - `AircraftMaintenanceIntervalSerializer`
3. Add helper methods for interval status computation:
   - classify `ok` / `due_soon` / `overdue`
   - include deterministic thresholds:
     - `due_soon` when <= 10 hours remaining OR <= 7 days remaining
4. Add views/viewsets for endpoints above.
5. Add permission classes for read vs write.
6. Add tests:
   - role authorization tests
   - interval calculation tests
   - company scoping tests

## Frontend Implementation Checklist

1. Add API methods in `frontend/src/shared/Api.js`:
   - `fetchFleetAircraft(params)`
   - `fetchFleetAircraftDetail(id)`
   - `fetchAircraftIntervals(aircraftId)`
   - `createAircraftInterval(aircraftId, payload)`
   - `updateAircraftInterval(id, payload)`
   - `completeAircraftInterval(id, payload)`
2. Build `AircraftSelector` component:
   - search by tail/model
   - show status chip and location
   - reusable across maintenance, dispatcher, flights, parts
3. New Fleet page:
   - searchable table
   - filter chips (`status`, `type`, `location`)
   - sortable columns
4. Aircraft detail page:
   - specs panel
   - photos gallery
   - linked counts to flights/workorders/discrepancies
   - intervals table with color-coded status
5. Role-aware actions:
   - hide/disable interval edit buttons for pilot/dispatcher

## Definition of Done (Phase 1)

- Fleet list supports search + sort + filters from client request.
- Aircraft detail includes specs, photos, and links to flights/work orders.
- Intervals show hours/days remaining with color coding and overdue flag.
- AD compliance is represented and filterable via `is_ad` interval records.
- Shared aircraft selector is used in at least two modules (Maintenance + Dispatcher minimum).
- Role behavior matches RBAC matrix above.
- Automated tests pass for permissions and interval computations.

## Suggested Delivery Sequence (Two Short Sprints)

### Sprint A (Backend-first)

- Model/migration + serializers + endpoints + tests
- Merge behind feature flag if needed

### Sprint B (Frontend integration)

- Fleet list/detail screens
- Shared selector rollout
- interval create/update/complete UX
- role-gated controls

## Verification Log

### Current Sprint A Verification

- `python3 manage.py check` passes with `System check identified no issues (0 silenced).`
- One earlier command was interrupted manually (`KeyboardInterrupt`) and is not a product defect.

### Known Local Test Environment Blocker

- `pytest` execution is currently blocked by local environment/plugin config:
  - `--nomigrations` addopts is present but not recognized in current test runtime.
  - `pytest-django` settings integration appears inactive in this shell context.
- Action: resolve local pytest plugin/settings setup, then re-run fleet endpoint tests.

## Notes

- Keep existing endpoints active during rollout; do not break current pages.
- Migrate consumers incrementally to new `/fleet/*` APIs.
- After adoption, deprecate overlapping legacy company endpoints in a later cleanup phase.
