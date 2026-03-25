# Role dashboards + API wiring roadmap

This is a living plan for connecting **all roles** and their dashboards to the frontend, including **tables/pages**, **navigation**, and the **backend endpoints** each area should call.

## Goals

- **Every role** has a clear landing dashboard with working data where endpoints exist.
- Each dashboard has **tables** (or links to table pages) that make it obvious what the user can do.
- **Site admin (staff/superuser)** can access **every sidebar page** (union of all role areas) for inspection/testing.
- We connect **existing endpoints first**, then define + implement missing backend endpoints for pilot/dispatcher.

## Current role → default route mapping (frontend)

Source: `frontend/src/shared/rbac.js`

- **owner / manager** → `/management`
- **mechanic** → `/maintenance`
- **pilot** → `/pilot-dashboard`
- **dispatcher** → `/dispatcher-dashboard`
- **site admin** (`is_staff` or `is_superuser`) → `/site-admin`

## Step A — Inventory what exists vs. what is missing (this sprint’s first task)

### Deliverable

A quick inventory table of:
- **Routes/pages that already exist** (and whether they render without errors)
- **Which tables/links exist on each page**
- **Which API calls the page makes today**
- **Which API calls it should make** (based on the endpoint map below)

### Inventory checklist

For each role landing route below, answer:
- **Page exists?** (Y/N)
- **Sidebar link exists?** (Y/N)
- **Shows table(s) or at least link(s) to tables?** (Y/N)
- **API calls visible in DevTools Network?** (list)
- **Blocking errors?** (list)

Role landing pages to inventory:
- `/management` (owner/manager)
- `/maintenance` (mechanic)
- `/pilot-dashboard` (pilot)
- `/dispatcher-dashboard` (dispatcher)
- `/site-admin` (site admin)

### Output format (fill in as we go)

| Route | Exists | Sidebar | Tables/Links | Current API calls | Blockers |
|------|--------|---------|--------------|-------------------|----------|
| `/management` |  |  |  |  |  |
| `/maintenance` |  |  |  |  |  |
| `/pilot-dashboard` |  |  |  |  |  |
| `/dispatcher-dashboard` |  |  |  |  |  |
| `/site-admin` |  |  |  |  |  |

## Step B — Connect roles with endpoints that already exist (fast wins)

### Owner/Manager (Management area)

Suggested sub-pages (tables) and backend endpoints:
- **Users**: `GET /api/company/users/`
- **Aircraft**: `GET /api/company/aircrafts/`
- **Flights**: `GET /api/company/flights/`
- **Management summary**: `GET /api/management/dashboard/`

Suggested routes:
- `/management/users`
- `/management/aircraft`
- `/management/flights`

### Mechanic (Maintenance area)

Suggested sub-pages (tables) and backend endpoints:
- **Inventory (detailed)**: `GET /api/company/inventories/detailed/`
- **Low stock inventory**: `GET /api/company/inventories/detailed/low-stock/`
- **Work orders**: `GET /api/company/workorders/`
- **Discrepancies**: `GET /api/company/discrepancies/`

Suggested routes:
- `/maintenance/inventories`
- `/maintenance/inventories/low-stock`
- `/maintenance/workorders`
- `/maintenance/discrepancies`

## Step C — Define backend contract gaps for Pilot + Dispatcher

Pilot/dispatcher dashboards should not be blocked by missing endpoints.

### Pilot (proposed minimum)

- **My upcoming flights**
- **My flight history**

Proposed endpoints (to implement on backend):
- `GET /api/pilot/flights/upcoming/`
- `GET /api/pilot/flights/history/`

### Dispatcher (proposed minimum)

- **Schedule overview**
- **Aircraft availability**
- (Optional) **Flights pending approval**

Proposed endpoints (to implement on backend):
- `GET /api/dispatcher/flights/calendar/` (or reuse existing calendar endpoint if appropriate)
- `GET /api/aircraft/availability/` (already exists)
- `GET /api/dispatcher/flights/pending-approval/` (optional)

## Step D — Wire pilot/dispatcher UI to the new endpoints

Once endpoints exist, follow the same pattern as management/maintenance:
- dashboard cards → sub-pages (tables) → `frontend/src/shared/Api.js` wrappers → endpoint

## Navigation rule (important)

### Normal users
- Sidebar shows only what the role supports.

### Site admin
- Sidebar shows the **union of all pages** grouped by area:
  - Management
  - Maintenance
  - Pilot
  - Dispatcher
  - Site Admin

## Notes / known issues spotted so far

- Backend “seed” command is documented but not present in repo (may impact quick data setup).
- If any company-scoped endpoints return `500`, treat as a backend implementation gap and log it here with the endpoint + traceback summary.

