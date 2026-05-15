# Phase 2 MVP — Final Deliverables

**Objective:** Aviation managers get real-time, visual tools for fast, informed decisions.

**Deploy target:** Shippable MVP in priority order below. Update status as each item ships.

| ID | Deliverable | Route / surface | Roles | Status |
|----|-------------|-----------------|-------|--------|
| 3.3.1 | Service History Search | `/service-history` | owner, manager, mechanic, dispatcher | **Shipped** |
| 3.1.1 | Fleet Availability Dashboard | `/management` (Overview tab) | owner, manager | Not started |
| 3.1.2 | Dashboard Configuration (live fleet panel; DnD deferred) | `/management` | owner, manager | Not started |
| 3.4.2 | Module-specific search | maintenance, dispatch, parts, fleet | per module | Not started |
| 3.4.1 | Site-wide search (Ctrl+K) | `Layout` command palette | company users* | Not started |
| 3.2.1 | Maintenance Analytics | `/analytics` | owner, manager | Not started |
| 3.2.2 | Fleet Performance Metrics | `/analytics` | owner, manager | Not started |
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

- Donut: Available / In-Maintenance / Grounded (`fleet_status` mapped)
- Open WO counts by priority
- KPI cards with trends + drill-down to `/work-orders`, `/fleet`

**API:** `GET /api/dashboard/fleet-availability/`

---

## 3.1.2 Dashboard Configuration

**MVP slice:** Live fleet status panel (all aircraft, badges, filter, click → `/fleet/:id`).  
**Deferred:** Drag-and-drop widget layout per user.

---

## 3.2.1 Maintenance Analytics

- Recurring issues by ATA/aircraft
- Labor-hours chart (requires `LaborEntry` model)
- Maintenance events per 100 flight hours

**API:** `GET /api/analytics/maintenance/`

---

## 3.2.2 Fleet Performance Metrics

- Utilization, uptime/downtime, on-time %

**API:** `GET /api/analytics/fleet-performance/`

---

## 3.3.2 Component History Timeline

- P/N or S/N search, timeline, life limits, export  
- Requires new models: `InstalledComponent`, `ComponentEvent`

---

## 3.4.1 Site-Wide Search

- Persistent Ctrl+K palette in `Layout`
- `GET /api/search/?q=` — grouped results, &lt;500ms

---

## 3.4.2 Module-Specific Search

- Debounced search on Maintenance, Dispatch, Parts; fleet uses API `?search=`

---

## Architecture (quick reference)

```
Layout (+ Ctrl+K later)
├── /management      → 3.1.x dashboards
├── /analytics       → 3.2.x
├── /service-history → 3.3.1  ← current sprint
├── /component-history → 3.3.2
└── existing modules (fleet, maintenance, work-orders, …)
```

**API prefixes:** `/api/history/`, `/api/dashboard/`, `/api/analytics/`, `/api/search/`

**Source of truth for roles:** `frontend/src/shared/rbac.js`, `docs/rbac/RBAC_MVP_MATRIX.md`
