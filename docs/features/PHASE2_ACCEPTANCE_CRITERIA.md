# Phase 2 — Acceptance Criteria Status

**Branch:** `dev-jj` (as of May 2026)  
**Objective:** Real-time, visual tools for aviation managers to make fast, informed decisions.

**Summary**

| Section | Complete | Not complete |
|---------|----------|--------------|
| Management Dashboard Visualizations | 5 / 6 | 1 |
| Analytics & Trends Workspace | 6 / 6 | 0 |
| Maintenance History | 6 / 6 | 0 |
| Live Search Across Modules | 6 / 6 | 0 |
| **Total** | **23 / 24** | **1** |

---

## Management Dashboard Visualizations

**Surface:** `/management` — `FleetAvailabilityPanel`, `FleetStatusPanel`

---

### MDV-001 — Pie/donut chart shows Available / In-Maintenance / Grounded

- **Status:** Yes
- **Notes:** Donut chart on Management overview via `FleetAvailabilityPanel`; segments map to fleet status (active, maintenance, grounded/AOG). API: `GET /api/dashboard/fleet-availability/`.

---

### MDV-002 — Open work order counts by priority

- **Status:** Yes
- **Notes:** Horizontal bars for critical / high / medium / low open work orders on the same panel.

---

### MDV-003 — KPI cards with trend indicators and drill-down navigation

- **Status:** Yes
- **Notes:** KPIs include availability %, critical open count, and 7-day closures vs prior week (trend chip). Drill-down links to `/fleet` and `/work-orders`.

---

### MDV-004 — Drag-and-drop widget arrangement saved per user

- **Status:** No
- **Notes:** Explicitly deferred for MVP. Dashboard layout is fixed; no per-user widget persistence.

---

### MDV-005 — Fleet status panel lists all aircraft with status badges

- **Status:** Yes
- **Notes:** `FleetStatusPanel` lists company aircraft from `/api/company/aircrafts/` with badges for active, maintenance due, AOG, grounded, etc.

---

### MDV-006 — Filter/sort by status; click navigates to detail

- **Status:** Yes
- **Notes:** Filter by status group, sort by tail / status / open WO count, search by tail or model. Row click opens `/fleet/:id`.

---

## Analytics & Trends Workspace

**Surface:** `/analytics` — `MaintenanceAnalyticsPanel`, `FleetPerformancePanel`

---

### ATW-001 — Recurring issues ranked by frequency with ATA/aircraft filters

- **Status:** Yes
- **Notes:** Maintenance analytics tab; `GET /api/analytics/maintenance/` with `ata` and `aircraft_id` query params.

---

### ATW-002 — Labor-hours chart with date range and grouping options

- **Status:** Yes
- **Notes:** Date range filters; group by week or month. Uses `LaborEntry` when logged; falls back to WO touch-time proxy when no entries exist.

---

### ATW-003 — Maintenance events per 100 flight hours metric

- **Status:** Yes
- **Notes:** Included in maintenance analytics API response and displayed on the analytics panel.

---

### ATW-004 — Utilization chart comparing flight hours vs available

- **Status:** Yes
- **Notes:** Fleet performance tab; flight hours vs available operational hours per tail. API: `GET /api/analytics/fleet-performance/`.

---

### ATW-005 — Uptime vs downtime visualization by aircraft

- **Status:** Yes
- **Notes:** Stacked hours view (flying / maintenance / idle) by aircraft on fleet performance panel.

---

### ATW-006 — On-time departure/arrival percentages with delay breakdown

- **Status:** Yes
- **Notes:** On-time % with breakdown by flight status on fleet performance panel.

---

## Maintenance History (Searchable and Usable)

**Surfaces:** `/service-history`, `/component-history`

---

### MH-001 — Search by date, tail#, ATA code, component, free-text

- **Status:** Yes
- **Notes:** `ServiceHistoryPage` filters: date range, tail, aircraft, ATA, component, status, and free-text `q`. API: `GET /api/history/work-orders/`.

---

### MH-002 — Paginated results with sortable columns

- **Status:** Yes
- **Notes:** Server-side pagination; column sort via `ordering` query param.

---

### MH-003 — Historical WO viewer with signoffs, parts, labor hours

- **Status:** Yes
- **Notes:** `WorkOrderHistoryViewer` shows activities/signoffs, parts used, and `LaborEntriesPanel` for labor hours. API: `GET /api/history/work-orders/<id>/`.

---

### MH-004 — Search by P/N or S/N shows full maintenance timeline

- **Status:** Yes
- **Notes:** `ComponentHistoryPage` search by part number, serial, name, tail, location. Detail view shows install/removal/inspection/WO/note events. API: `GET /api/history/components/`.

---

### MH-005 — Life-limit tracking and current location displayed

- **Status:** Yes
- **Notes:** Serialized units: hours / cycles / calendar limits with used/remaining and progress bar. Location shown as aircraft tail or shop/stock field.

---

### MH-006 — Export for compliance audits

- **Status:** Yes
- **Notes:** CSV export per tracked component. API: `GET /api/history/components/<id>/export/`.

---

## Live Search Across Modules

**Surfaces:** Layout (Ctrl+K), Maintenance, Dispatch, Parts, Fleet

---

### LSM-001 — Persistent search bar with keyboard shortcut (Ctrl+K)

- **Status:** Yes
- **Notes:** `SiteSearchDialog` in app layout; Ctrl+K / ⌘K; sidebar search entry. API: `GET /api/search/?q=`.

---

### LSM-002 — Partial match, case-insensitive, <500ms response

- **Status:** Yes
- **Notes:** `icontains` filters on backend; 300ms debounce on frontend. Typical responses are well under 500ms for company-scoped data.

---

### LSM-003 — Results grouped by category with counts

- **Status:** Yes
- **Notes:** Response grouped by aircraft, work orders, discrepancies, parts, flights (role-scoped). Each group has label and item list.

---

### LSM-004 — Each module has dedicated contextual search

- **Status:** Yes
- **Notes:** `ModuleSearchBar` on Maintenance, Dispatcher dashboard, Parts, and Fleet pages.

---

### LSM-005 — Auto-complete suggestions with status filters

- **Status:** Yes
- **Notes:** Autocomplete from visible dataset (≥2 characters) plus status chips/toggles per module (`shared/moduleSearch.js`).

---

### LSM-006 — Results update as typing (debounced)

- **Status:** Yes
- **Notes:** `useDebouncedValue` with 300ms delay across module search and site-wide palette.

---

## Tool & Equipment Calibration

**Surface:** `/parts?tab=tools` — **Calibrated tools** tab on Parts (`ToolsCalibrationPanel`). Legacy `/tools` redirects here. Criteria: [TOOL_CALIBRATION_TRACKING.md](TOOL_CALIBRATION_TRACKING.md) (TEC-001–TEC-008).

| ID | Status |
|----|--------|
| TEC-001 Registry with status chips | Yes |
| TEC-002 Summary stat cards | Yes |
| TEC-003 Search and status filters | Yes |
| TEC-004 Add / edit tool | Yes |
| TEC-005 Calibration history on detail | Yes |
| TEC-006 Record calibration | Yes |
| TEC-007 Nav and route protection | Yes |
| TEC-008 Owner-only delete | Yes |

---

## Optional / out of scope (not in checklist above)

- **Site-wide search for users** — Original Phase 2 wording mentioned indexing users; current implementation does not include a users group (aircraft, WO, disc, parts, flights only).
- **Component history ↔ work order auto-link** — Parts issued on a WO do not automatically create component timeline events (manual register/link today).
- **Dashboard drag-and-drop** — See MDV-004.

---

## Quick reference — routes

| Feature | Route |
|---------|--------|
| Management dashboard | `/management` |
| Analytics | `/analytics` |
| Service history | `/service-history` |
| Component history | `/component-history` |
| Tools & calibration | `/parts?tab=tools` (redirect from `/tools`) |
| Site search | Ctrl+K (any authenticated layout) |

**Detailed implementation notes:** [PHASE2_MVP.md](PHASE2_MVP.md)

**Production go-live (separate from this checklist):** [../operations/PRODUCTION_READINESS_ROADMAP.md](../operations/PRODUCTION_READINESS_ROADMAP.md)
