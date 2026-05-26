## Alpha Aviation RBAC Plan

This document captures the planned changes for role‑based access control (RBAC) and secure authentication, so backend and frontend stay aligned.

---

## 1. Roles and Responsibilities

- **owner**
  - Full access to all company data.
  - Can view management dashboard, all flights, work orders, discrepancies, inventory.
  - Can manage users within their company (e.g., assign roles, activate/deactivate accounts) if/when implemented.

- **manager**
  - Similar to owner, but scoped to operational control rather than account administration.
  - Can view management dashboard and all company resources (flights, work orders, discrepancies, inventory).
  - Can approve / reject flights and work orders, if approval flows exist.

- **mechanic**
  - Full access to **maintenance and inventory** for their company:
    - Work orders, discrepancies, aircraft maintenance status, parts, inventories.
  - Cannot see or edit HR / user management; limited/no access to broader management analytics beyond maintenance context.

- **pilot**
  - Can view **their own flights**, scheduling, and aircraft availability.
  - Can create/view discrepancies they report.
  - **Should not** access maintenance admin (e.g., closing work orders, inventory admin) or see sensitive company‑wide maintenance metrics.

- **dispatcher** (planned)
  - Focused on flight scheduling and resource coordination.
  - Can:
    - View aircraft availability and constraints (maintenance status, open discrepancies).
    - Create/update flights and assign pilots, within company.
  - Does not manage deep inventory or user administration.

---

## 2. Backend RBAC Design (Django / DRF)

### 2.1 User & Role Model

- **Model**: `Profile` (extends `AbstractUser`).
- **Fields of interest**:
  - `company`: `ForeignKey(Company, null=True, blank=True)` – ties users to a company.
  - `company_role`: `CharField(choices=role_choices, default='pilot')`.
- **Planned change**:
  - Ensure `role_choices` includes: `owner`, `manager`, `mechanic`, `pilot`, `dispatcher`.
- **Helper methods** already exist:
  - `is_owner()`, `is_manager()`, `is_mechanic()`, `is_pilot()`; optionally add `is_dispatcher()`.

### 2.2 Permission Classes

Create `backend/api/permissions.py` with reusable DRF permissions:

- **`IsCompanyMember`**
  - Requires `request.user.is_authenticated` and `request.user.company is not None`.
  - For object‑level checks, verifies `obj.company == request.user.company` (or equivalent per model).

- **`HasCompanyRole(allowed_roles: list[str])`**
  - Checks `request.user.company_role in allowed_roles`.
  - Convenience wrappers (optional):
    - `IsMechanic`, `IsPilot`, `IsManager`, `IsOwner`, `IsDispatcher`.

### 2.3 Applying Permissions to Endpoints

High‑level mapping of permissions to API areas (final mapping to be done per view/viewset):

- **Auth & health**
  - `POST /api/auth/login/`, `/api/auth/token/refresh/`, `/api/auth/logout/`: existing behavior with JWT; no role checks beyond auth where applicable.
  - `GET /api/health/`: `AllowAny`.
  - `GET /api/users/me/`: `IsAuthenticated`.

- **Company‑scoped endpoints (`/api/company/...`)**
  - Always require: `IsAuthenticated`, `IsCompanyMember`.
  - Additional role constraints:
    - `/api/company/users/`, `/api/company/role/`: `HasCompanyRole(['owner', 'manager'])`.
    - `/api/company/inventories/`: `HasCompanyRole(['mechanic', 'manager', 'owner'])`.
    - `/api/company/workorders/`: `HasCompanyRole(['mechanic', 'manager', 'owner'])`.
    - `/api/company/aircrafts/`, `/api/company/flights/`: `HasCompanyRole(['dispatcher', 'manager', 'owner', 'mechanic'])` (exact list to be finalized).

- **Maintenance (Work Orders & Discrepancies)**
  - `GET/POST/PUT/PATCH/DELETE /api/workorders/` and `/api/discrepancies/`:
    - `IsAuthenticated`, `IsCompanyMember`,
    - `HasCompanyRole(['mechanic', 'manager', 'owner'])` for write operations.
    - Read operations may be broader (e.g., pilots can view discrepancies they filed or work orders on their flights).

- **Inventory & Parts**
  - `/api/parts/` (read‑only): `IsAuthenticated`, `IsCompanyMember` (optionally allow all roles).
  - `/api/inventories/` and low‑stock endpoints:
    - `IsAuthenticated`, `IsCompanyMember`,
    - `HasCompanyRole(['mechanic', 'manager', 'owner'])` for write and sensitive reads (e.g., low‑stock dashboards).

- **Flights & Scheduling**
  - `/api/flights/`, `/api/flights/<id>/`, `/api/flights/calendar/`:
    - Default: `IsAuthenticated`, `IsCompanyMember`.
    - Creation/updates: `HasCompanyRole(['dispatcher', 'manager', 'owner'])`.
    - Pilots see only flights where they are `primary_pilot` or `secondary_pilot`.

- **Management Dashboard**
  - `/api/management/dashboard/`:
    - `IsAuthenticated`, `IsCompanyMember`,
    - `HasCompanyRole(['manager', 'owner'])`.

### 2.4 Company Scoping Rules

Across all company‑bound models (`Aircraft`, `Inventory`, `Flight`, work order, discrepancy, etc.):

- **Querysets**:
  - List endpoints must **always** filter by `company=request.user.company`.
- **Object retrieval**:
  - Retrieve/update/delete must ensure the object’s `company` matches `request.user.company` (via queryset filtering or object‑level permissions).
- **No cross‑company access**:
  - IDs from the client are never trusted alone; company condition is mandatory.

### 2.5 JWT & Security Configuration (Summary)

- Use `rest_framework_simplejwt` with:
  - Short‑lived access tokens (e.g., 5–15 minutes).
  - Reasonable refresh token lifetime.
  - Blacklist enabled for logout (`/auth/logout/` already blacklists refresh tokens).
- Production hardening (to be set in `settings.py` when deploying):
  - `SECURE_SSL_REDIRECT = True`, `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True`.
  - Proper `CORS_ALLOWED_ORIGINS` and `ALLOWED_HOSTS`.

---

## 3. Frontend RBAC Integration (React)

### 3.1 Fetching Role & Company

- After successful login:
  - Call `GET /api/users/me/` and, if needed, a profile endpoint to retrieve:
    - `company_role`, `company`, and other user metadata.
  - Store in global app state (`AppContext`) alongside access/refresh tokens.

### 3.2 Route & Navigation Guards

- Extend `ProtectedRoute` to accept an optional `allowedRoles` prop.
  - If `allowedRoles` is provided and `user.company_role` is not in that list, redirect to a safe page (e.g., `/management` or `/login`) or show an unauthorized message.
- Example route wiring (conceptual):
  - `/maintenance`, `/parts`: `allowedRoles=['mechanic', 'manager', 'owner']`.
  - `/management`: `allowedRoles=['manager', 'owner']`.
  - Flight scheduling pages: `allowedRoles=['dispatcher', 'manager', 'owner']`.
- Navigation (menus, sidebar) should hide links that the current role cannot access, for better UX (but **backend remains the source of truth** for security).

### 3.3 API Helpers

- Continue using `shared/Api.js` with:
  - Centralized Axios client, JWT handling, refresh flow, and error handling.
  - Add helper functions for:
    - `fetchCurrentUser`, `fetchCompanyWorkorders`, `fetchCompanyInventories`, `fetchFlights`, etc.
  - Frontend should treat permission errors (403) by:
    - Showing a clear message, and/or
    - Redirecting the user away from unauthorized features.

---

## 4. Implementation Order (Summary)

1. **Backend**
   - Update `Profile.role_choices` with `dispatcher`.
   - Implement `permissions.py` (`IsCompanyMember`, `HasCompanyRole`, helpers).
   - Apply permissions and company scoping to:
     - `/company/*` endpoints,
     - Work orders, discrepancies, inventory, flights, management dashboard.
2. **Frontend**
   - Fetch and store `company_role` and `company` after login.
   - Enhance `ProtectedRoute` and navigation to respect roles.
   - Gradually replace mock data (Maintenance, Parts, etc.) with real API calls that hit the now‑secured endpoints.

This document is the reference for RBAC and auth work; as we implement, any deviations or new requirements should be added here.

---

## 5. Current Implementation Snapshot (dev-jj WIP)

This section captures the **current state on branch `dev-jj`** after integrating work from the backend feature branches and wiring up the React admin.

### 5.1 Backend

- `Profile.role_choices` now includes **owner, manager, mechanic, pilot, dispatcher** plus helper methods (`is_owner`, `is_manager`, `is_mechanic`, `is_pilot`, `is_dispatcher`).
- New models from the maintenance branch have been merged into `api.models`:
  - `WorkOrder`, `WorkOrderPart`, `Discrepancy`.
  - `Flight.approved` and `Flight.pilot_requirement` fields are present and migrated.
- New DRF permission classes live in `api/permissions.py`:
  - `IsCompanyMember`, `HasCompanyRole`, `ReadOnly`, `IsOwner`, `IsManagerOrOwner`, `IsMechanicOrManager`, `IsOwnProfileOrManager`.
- These permissions are applied to:
  - Viewsets: `CompanyViewSet`, `ProfileViewSet`, `AircraftViewSet`, `PartViewSet`, `DiscrepancyViewSet`, `WorkOrderViewSet`, `FlightViewSet`, `InventoryViewSet`.
  - Function views: `/company/users/`, `/company/inventories/`, `/company/aircrafts/`, `/company/flights/`, `/company/workorders/`, `/company/discrepancies/`, `/company/role/`, `/management/dashboard/`.
- Inventory endpoints used by the frontend:
  - `GET /api/company/inventories/detailed/` — company‑scoped list + create, returns `InventorySerializer` with nested `CompanySerializer` and `PartSerializer` (including `aircraft_name`).
  - `GET /api/company/inventories/detailed/low-stock/` — same shape, filtered in Python using `Inventory.low_stock()`.
- Authentication:
  - `POST /api/auth/login/` issues JWT access + refresh tokens, is explicitly CSRF‑exempt and does **not** rely on session authentication.
  - `POST /api/auth/token/refresh/` and `POST /api/auth/logout/` are wired for token refresh and blacklisting.
  - `GET /api/users/me/` returns `{ id, username, email, first_name, last_name, company_role, company, company_name }` for frontend RBAC.
- Admin UX:
  - `CompanyAdmin` has inlines for **Users, Aircraft, Inventory, Flights** plus custom CSS/JS to make inline tables usable.
  - `InventoryAdmin` shows low‑stock flags and allows per‑company filtering.
- Migrations:
  - `0025_alter_profile_company_role_workorder_discrepancy_and_more` and `0026_alter_aircraft_registration_number` are present and applied.

### 5.2 Frontend

- Global auth/RBAC state (`AppContext`):
  - Stores `user.role`, `user.companyId`, and `user.companyName` from `/users/me/`.
  - On app load, if tokens exist, we validate them via `/users/me/` and hydrate state.
- `loginUser` + `fetchCurrentUser` flow:
  - `POST /auth/login/` → store access/refresh tokens.
  - Immediately call `/users/me/` to get the role + company and dispatch `UPDATE_USER`.
- **Role‑based landing pages**:
  - After login:
    - `owner` / `manager` → `/admin/companies`
    - `mechanic` → `/maintenance`
    - everyone else (e.g., `pilot`, `dispatcher`) → `/management`
  - Hitting `/login` while already authenticated will also redirect to the appropriate default for the current role (no “last user’s page” bleed‑over).
- `ProtectedRoute` and navigation:
  - `ProtectedRoute` accepts an `allowedRoles` array; if `state.user.role` is not included, the user is redirected to `/management`.
  - `NavigationDrawer` hides menu items when the current role is not in the item’s `allowedRoles`.
- Admin UI:
  - **Organizations** list (`/admin/companies`) reads from `GET /companies/` and shows each company as a card; clicking currently routes to a **“New organization”** form wired for create‑only (edit/readback is a known TODO).
  - **Parts page** (`/parts`) calls:
    - `GET /company/inventories/detailed/`
    - `GET /company/inventories/detailed/low-stock/`
    - `DELETE /inventories/{id}/`
    and renders live inventory KPIs + tables per company and role.
  - **Maintenance page** (`/maintenance`) calls:
    - `GET /company/workorders/`
    - `GET /company/discrepancies/`
    and renders KPIs + lists based on real data (when present).

### 5.3 Known Gaps / WIP

- React **New organization** form (`/admin/companies/new`) only creates companies + aircraft; it does **not** yet:
  - Load existing company data when you click a card.
  - Create `Profile` users or bind them to companies; user provisioning is still Django admin‑driven.
- Flights are fully modeled/API‑backed but have minimal frontend visualization beyond lists and management KPIs.
- Some error states (403/401) are surfaced as generic alerts in the UI; polishing these messages and UX is a follow‑up task.

---

## 6. User Provisioning & Admin Workflow

### 5.1 Source of Truth for Users

- **No public self‑registration**.
- All users are created and managed via **Django admin** (or internal scripts/management commands), which acts as the source of truth for:
  - `Profile` accounts
  - Role assignments (`company_role`)
  - Company membership (`company`)

### 5.2 Initial Setup Flow (New Environment)

1. **Create a Django superuser** (backend shell):
   - From the `backend` directory:
     - `python manage.py createsuperuser`
   - This account is for internal administrators only; they can log into `/admin` and configure the system.

2. **Create at least one Company** in `/admin`:
   - Use the `Company` model to create a record (e.g., “Acme Aviation”).

3. **Create initial application users (`Profile` records)**:
   - In `/admin`, under `Profiles`:
     - Create a user for each real person.
     - Set:
       - `username` + password
       - `company` (the company they belong to)
       - `company_role` (one of: owner, manager, mechanic, pilot, dispatcher)
     - Optionally set `is_staff`/`is_superuser` for internal platform admins (not typical end‑users).

4. **Login through the frontend**:
   - Users log in with:
     - `username` / `password` → `/api/auth/login/` via the React login page.
   - On successful login, the frontend:
     - Stores access/refresh tokens.
     - Calls `/api/users/me/` to get `company_role`, `company`, and `company_name`.
     - Uses `company_role` to control which routes and navigation items are available.

### 5.3 Ongoing User Management

- **Creating new users**:
  - Admins (superuser or designated staff) use Django admin to:
    - Create `Profile` records for new hires.
    - Assign appropriate `company_role` and `company`.
- **Updating roles**:
  - Role changes (e.g., pilot → manager) are done in admin by updating `company_role`.
  - Changes take effect immediately for the next request; frontend will see the new role on the next `/users/me/` call or page refresh.
- **Deactivating users**:
  - Use `is_active = False` in Django admin to revoke access while preserving history.

### 5.4 Future Enhancements (Optional)

- **Invite‑based onboarding**:
  - Add an internal‑only endpoint or management command to:
    - Generate a one‑time invite link.
    - Allow the invited user to set their password (while their role and company are pre‑assigned).
- **Company‑level “owner” tooling**:
  - Expose a limited UI for `owner` or `manager` roles to:
    - View users in their company.
    - Request new accounts / role changes, which are then approved by a central admin.

