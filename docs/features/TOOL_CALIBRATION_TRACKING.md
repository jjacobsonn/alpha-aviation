# Tool & Equipment Calibration Tracking — Frontend Plan

**Status:** Backend complete · Frontend on Parts page  
**Surface:** `/parts?tab=tools` — **Calibrated tools** tab (no separate sidebar item). `/tools` redirects to this tab.  
**API reference:** `docs/architecture/APIContract.md` → Tool & Equipment Management

---

## What already exists (backend)

| Piece | Location / endpoint |
|--------|---------------------|
| `Tool` model | `name`, `serial_number`, `description`, `calibration_due_date`, `location`, company FK |
| `CalibrationRecord` model | `calibration_date`, `performed_by`, `next_due_date`, `notes` |
| Computed fields | `calibration_alert`: `green` \| `amber` \| `red`; `status`: `available` \| `calibration_due` \| `overdue` |
| Alert rules | Green: >10 days until due · Amber: ≤10 days · Red: past due |
| REST API | `GET/POST /api/tools/`, `GET/PUT/PATCH/DELETE /api/tools/<id>/` |
| Calibration actions | `POST /api/tools/<id>/record_calibration/`, `GET /api/tools/<id>/calibration_history/` |
| Company list shortcut | `GET /api/company/tools/` (same payload as list) |
| Permissions | `IsMechanicOrManager` → owner, manager, mechanic (+ platform admin) |
| Admin UI | Django admin: `ToolAdmin` + `CalibrationRecordInline` |

**Not in backend today:** site-wide search indexing for tools, CSV export, email alerts, work-order linkage.

---

## User goals

1. **Registry** — See all calibrated tools/equipment for the shop with due dates and status at a glance.
2. **Compliance** — Log each calibration event; system rolls forward `calibration_due_date` from `next_due_date`.
3. **Triage** — Quickly find overdue and due-soon items before they block maintenance work.
4. **Audit** — Open a tool and read full calibration history (who performed, when, notes).

---

## Proposed UX (MVP)

Mirror patterns from **Component History** (stat cards + table + detail) and **Parts** (add/edit dialogs, `ModuleSearchBar`).

### Page layout: `ToolsPage` at `/tools`

```
┌─────────────────────────────────────────────────────────────┐
│  Tools & Calibration                    [+ Add tool]        │
├─────────────────────────────────────────────────────────────┤
│  [Overdue: 2]  [Due ≤10d: 5]  [OK: 18]   ← stat cards      │
├─────────────────────────────────────────────────────────────┤
│  ModuleSearchBar: search + status chips (all / due / overdue)│
├─────────────────────────────────────────────────────────────┤
│  Table: Name | S/N | Location | Due date | Status chip      │
│         row click → detail panel or navigate ?tool=id       │
└─────────────────────────────────────────────────────────────┘
```

### Detail (drawer or split panel — match Component History)

- Tool fields (read-only for mechanics on delete; supervisors edit metadata)
- **Calibration history** table (newest first) from `GET .../calibration_history/`
- Primary action: **Record calibration** → dialog → `POST .../record_calibration/`
- On success: refresh tool row + history; due date updates from API side effect

### Status chips (map API fields)

| `calibration_alert` | `status` | Chip label | Color |
|---------------------|----------|------------|-------|
| `green` | `available` | OK | success |
| `amber` | `calibration_due` | Due soon | warning |
| `red` | `overdue` | Overdue | error |

### Role behavior (align with existing RBAC)

| Action | Owner | Manager | Mechanic |
|--------|-------|---------|----------|
| View list & history | ✓ | ✓ | ✓ |
| Add / edit tool | ✓ | ✓ | ✓ |
| Record calibration | ✓ | ✓ | ✓ |
| Delete tool | ✓ | optional: manager only | ✗ (match Parts: owner delete) |

*Recommendation:* Owner-only delete (same as Parts page `canDeleteParts`).

---

## Acceptance criteria

### TEC-001 — Tools registry lists company tools with status

- **Given** a user with mechanic, manager, or owner role  
- **When** they open `/tools`  
- **Then** the page loads tools from `GET /api/tools/` (or `/api/company/tools/`)  
- **And** each row shows name, serial number, location, calibration due date, and a status chip from `calibration_alert` / `status`.

### TEC-002 — Summary counts for overdue, due soon, and OK

- **Given** the loaded tool list  
- **When** the page renders stat cards  
- **Then** counts reflect: overdue (`red`), due within 10 days (`amber`), OK (`green`)  
- **And** clicking a card filters the table to that status (optional but recommended).

### TEC-003 — Search and status filters (client-side MVP)

- **Given** the tools table  
- **When** the user types in search (≥2 chars for suggestions) or selects a status chip  
- **Then** rows filter by name, serial number, location, or description (case-insensitive)  
- **And** status filter matches `calibration_alert` or `status` (same as `moduleSearch` pattern on Parts).

### TEC-004 — Add and edit tool metadata

- **Given** a user with write access  
- **When** they submit Add tool or Edit tool  
- **Then** `POST /api/tools/` or `PATCH /api/tools/<id>/` is called with `name`, `serial_number`, `description`, `calibration_due_date`, `location`  
- **And** the table refreshes with validation errors shown inline.

### TEC-005 — Tool detail shows calibration history

- **Given** a selected tool  
- **When** detail is opened  
- **Then** `GET /api/tools/<id>/calibration_history/` populates a history table (date, performed by, next due, notes)  
- **And** current `calibration_due_date` is visible in the header.

### TEC-006 — Record calibration updates due date

- **Given** a tool detail view  
- **When** the user submits Record calibration with `calibration_date`, `performed_by`, `next_due_date`, optional `notes`  
- **Then** `POST /api/tools/<id>/record_calibration/` returns 201  
- **And** the tool’s displayed due date updates to `next_due_date`  
- **And** the new record appears at the top of history.

### TEC-007 — Navigation and route protection

- **Given** the app sidebar  
- **When** an authorized user opens **Parts**  
- **Then** a **Calibrated tools** tab is available next to **Inventory**  
- **And** `/parts` (and legacy `/tools` redirect) are protected with the same roles as `parts`: owner, manager, mechanic.

### TEC-008 — Delete tool (owner only)

- **Given** an owner (not view-as)  
- **When** they confirm delete  
- **Then** `DELETE /api/tools/<id>/` removes the tool and calibration history  
- **And** mechanics/managers do not see delete.

---

## Out of scope (MVP) — track as follow-ups

| Item | Notes |
|------|--------|
| TEC-009 Management KPI widget | Count overdue/due on `/management`; needs design slot |
| TEC-010 Site search (Ctrl+K) | Backend search endpoint has no tools group today |
| TEC-011 CSV export | Parity with component history export |
| TEC-012 WO sign-off gate | “Block if calibrated tool overdue” — no API link yet |
| Server-side pagination/filter | List is company-scoped; client filter OK until scale proves otherwise |

---

## Implementation checklist (frontend)

### 1. API client (`frontend/src/shared/Api.js`)

```javascript
export const fetchTools = () => makeApiRequest('GET', '/tools/');
export const fetchTool = (id) => makeApiRequest('GET', `/tools/${id}/`);
export const createTool = (payload) => makeApiRequest('POST', '/tools/', payload);
export const updateTool = (id, payload) => makeApiRequest('PATCH', `/tools/${id}/`, payload);
export const deleteTool = (id) => makeApiRequest('DELETE', `/tools/${id}/`);
export const fetchToolCalibrationHistory = (id) =>
  makeApiRequest('GET', `/tools/${id}/calibration_history/`);
export const recordToolCalibration = (id, payload) =>
  makeApiRequest('POST', `/tools/${id}/record_calibration/`, payload);
```

### 2. RBAC (`frontend/src/shared/rbac.js`)

```javascript
tools: ["owner", "manager", "mechanic"],
```

Add `allowedRolesForModule('tools')` usage in `App.js` and `NavigationDrawer.js`.

### 3. Module search helpers (`frontend/src/shared/moduleSearch.js`)

- `TOOLS_STATUS_FILTERS`: all, due_soon, overdue, ok  
- `filterToolsRows(tools, { q, status })`  
- `buildToolsSuggestions(tools, q)`

### 4. UI component

- `frontend/src/components/parts/ToolsCalibrationPanel.js` — embedded on Parts page
- `frontend/src/pages/ToolsPage.js` — redirect only (`/tools` → `/parts?tab=tools`)

### 5. Routing & nav

- `PartsPage.js`: MUI `Tabs` — Inventory | Calibrated tools
- `App.js`: keep `/tools` route as redirect for bookmarks
- No separate Tools sidebar item

### 6. Tests (light)

- `frontend/src/tests/pages/ToolsPage.test.js` — smoke: renders, filters by status, mocks API

### 7. Docs cross-links

- Add section to `PHASE2_ACCEPTANCE_CRITERIA.md` (optional) or link here from Phase 2 doc  
- No API contract changes required for MVP

---

## Suggested build phases

| Phase | Deliverable | Criteria |
|-------|-------------|----------|
| **A** | API + route + empty page | TEC-007 |
| **B** | List + stat cards + filters | TEC-001, TEC-002, TEC-003 |
| **C** | Add/edit tool dialogs | TEC-004 |
| **D** | Detail + history + record calibration | TEC-005, TEC-006 |
| **E** | Owner delete + tests | TEC-008 |

Phases A–D = shippable MVP. Phase E = polish.

---

## UI details (copy & validation)

**Add / Edit tool form**

- Name (required)
- Serial number (required)
- Description (optional)
- Location (optional) — e.g. “Tool Crib A”, “Hangar 2”
- Initial / next calibration due date (required, date input)

**Record calibration dialog**

- Calibration date (default: today)
- Performed by (required) — free text vendor, e.g. “J.A. King Calibration Services”
- Next due date (required) — typically +12 months; user enters explicitly (API does not compute interval)
- Notes (optional)

**Empty states**

- No tools: CTA “Add your first tool”  
- No history: “No calibrations recorded yet” + Record calibration button

**Errors**

- Surface `400` field errors from DRF under form fields  
- Network/auth: `Alert` banner like other pages

---

## Optional enhancements (post-MVP)

1. **Deep link:** `/tools?tool=5` opens detail (same as service history `?id=` pattern).  
2. **Default next due:** When recording, suggest `next_due_date` = calibration_date + 1 year (client only).  
3. **Management tile:** “Tools overdue” KPI linking to `/tools?status=overdue`.  
4. **Backend:** Add tools to `GET /api/search/?q=` for Ctrl+K.  
5. **Backend:** `GET /api/tools/export/` CSV for audit binder.

---

## Quick reference

| Item | Value |
|------|--------|
| Route | `/parts?tab=tools` |
| API base | `/api/tools/` |
| Roles | owner, manager, mechanic |
| Closest UI references | `ComponentHistoryPage.js`, `PartsPage.js` |
| Admin fallback | Django admin until MVP ships |
