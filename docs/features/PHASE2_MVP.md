# Phase 2 MVP — Final Deliverables

**Objective:** Aviation managers get real-time, visual tools for fast, informed decisions.

**Deploy target:** Shippable MVP in priority order below. Update status as each item ships.

| ID | Deliverable | Route / surface | Roles | Status |
|----|-------------|-----------------|-------|--------|
| 3.3.1 | Service History Search | `/service-history` | owner, manager, mechanic, dispatcher | **Shipped** |
| 3.1.1 | Fleet Availability Dashboard | `/management` (Overview tab) | owner, manager | **Shipped** (core charts + KPIs) |
| 3.1.2 | Dashboard Configuration (live fleet panel; DnD deferred) | `/management` | owner, manager | **Shipped** (panel + filter/sort; DnD out of scope) |
| 3.4.2 | Module-specific search | maintenance, dispatch, parts, fleet | per module | **Shipped** |
| 3.4.1 | Site-wide search (Ctrl+K) | `Layout` command palette | company users* | Shipped |
| 3.2.1 | Maintenance Analytics | `/analytics` | owner, manager | **Shipped** |
| 3.2.2 | Fleet Performance Metrics | `/analytics` | owner, manager | **Shipped** |
| 3.3.2 | Component History Timeline | `/component-history` | owner, manager, mechanic | Not started |

\* Pilots: no Phase 2 manager surfaces in MVP.

---

## 3.3.1 Service History Search (Sprint 1 — ship first)

**Acceptance criteria**

- [x] Search by date range, tail#, ATA code, component, free-text
- [x] Paginated results with sortable columns
- [x] Historical WO viewer: signoffs, parts, labor hours (labor: placeholder until model exists)

**Frontend**

- Page: `frontend/src/pages/ServiceHistoryPage.js`
- Viewer: `frontend/src/components/history/WorkOrderHistoryViewer.js`
- Nav: “Service History” in sidebar

**Backend**

- `GET /api/history/work-orders/` — list + filters + pagination
- `GET /api/history/work-orders/<id>/` — full WO detail + activities

**RBAC:** `IsServiceHistoryReader` — owner, manager, mechanic, dispatcher (+ platform admin)

---

## 3.1.1 Fleet Availability Dashboard

**Acceptance criteria (MVP)**

- [x] Visual breakdown of fleet by availability (maps `fleet_status`: active vs maintenance vs grounded/AOG)
- [x] Open work orders by priority (horizontal bars)
- [x] KPI cards: availability %, critical open count, closures last 7d vs prior week
- [x] Drill-down: links to `/fleet`, `/work-orders`

**API:** `GET /api/dashboard/fleet-availability/` (same RBAC as management dashboard — owner/manager)

**Frontend:** `FleetAvailabilityPanel` on `frontend/src/pages/Management.js`

---

## 3.1.2 Dashboard Configuration

**MVP slice (shipped)**

- [x] Live **Fleet status** panel: all company aircraft from `/company/aircrafts/`
- [x] Badges for `fleet_status` (active, maintenance due, AOG, grounded)
- [x] Filter by status group, sort (tail / status / open WO count), search tail or model
- [x] Row click → `/fleet/:id`
- [ ] Drag-and-drop widget layout per user — **deferred**

**Frontend:** `FleetStatusPanel` on `frontend/src/pages/Management.js`

---

## 3.2.1 Maintenance Analytics (shipped)

**Acceptance criteria**

- [x] Recurring issues ranked by frequency with ATA + aircraft filters
- [x] Labor-hours chart with date range and week/month grouping (WO touch-time proxy until `LaborEntry`)
- [x] Maintenance events per 100 flight hours

**API:** `GET /api/analytics/maintenance/` — query: `date_from`, `date_to`, `aircraft_id`, `ata`, `group_by`

**Frontend:** `MaintenanceAnalyticsPanel` on `/analytics`

---

## 3.2.2 Fleet Performance Metrics (shipped)

**Acceptance criteria**

- [x] Utilization: flight hours vs available operational hours per tail
- [x] Uptime vs downtime stacked hours (flying / maintenance / idle)
- [x] On-time % with delay breakdown by flight status

**API:** `GET /api/analytics/fleet-performance/`

**Frontend:** `FleetPerformancePanel` on `/analytics`

---

## 3.3.2 Component History Timeline

- P/N or S/N search, timeline, life limits, export  
- Requires new models: `InstalledComponent`, `ComponentEvent`

---

## 3.4.1 Site-Wide Search (shipped)

**Acceptance criteria**

- [x] Persistent Ctrl+K / ⌘K palette in `Layout` (+ sidebar Search entry)
- [x] `GET /api/search/?q=` — grouped, role-scoped results (debounced 300ms)
- [x] Deep links: fleet detail, maintenance WO/disc, parts, calendar flight, pilot disc

**Role scope (matches `rbac.js`):** owner/manager/mechanic — aircraft, WO, disc, parts, flights; dispatcher — aircraft, WO, flights; pilot — own discrepancies + flights.

**Shared:** `SiteSearchDialog`, `SiteSearchTrigger`, `shared/searchNavigation.js`

---

## 3.4.2 Module-Specific Search (shipped)

**Acceptance criteria**

- [x] Dedicated contextual search on Maintenance, Dispatch (dashboard), Parts, Fleet
- [x] Status filters per module (chips / toggles / existing fleet filters)
- [x] Debounced filtering (300ms) as you type
- [x] Autocomplete suggestions from visible dataset (≥2 characters)

**Shared:** `ModuleSearchBar`, `useDebouncedValue`, `shared/moduleSearch.js`

---

## Architecture (quick reference)

```
Layout (+ site search ✓)
├── /management      → 3.1.x (fleet availability KPIs shipped)
├── /analytics       → 3.2.x ✓
├── /service-history → 3.3.1 ✓
├── /component-history → 3.3.2
└── existing modules (fleet, maintenance, work-orders, …)
```

**API prefixes:** `/api/history/`, `/api/dashboard/`, `/api/analytics/`, `/api/search/`

**Source of truth for roles:** `frontend/src/shared/rbac.js`, `docs/rbac/RBAC_MVP_MATRIX.md`
