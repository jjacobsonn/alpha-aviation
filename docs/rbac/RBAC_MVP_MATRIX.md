# RBAC MVP Matrix

This is the baseline RBAC matrix for the current app and the MVP target we should stabilize next.

## Roles

- `owner`
- `manager`
- `dispatcher`
- `mechanic`
- `pilot`
- `platform_admin` (staff/superuser tenant override)

Legend:

- `V` = view/read
- `C` = create/submit
- `E` = edit/update
- `D` = delete

## MVP Rules (Target)

- Owner is the only business role with delete authority across operational records.
- Manager supervises operations but does not delete in MVP.
- Dispatcher and mechanic are execution roles (can submit/update where operationally needed).
- Pilot can submit flight requests/discrepancies and view operational context.
- Platform admin can bypass tenant RBAC for support/admin flows.

## Module Matrix (MVP Target)

| Module / Action | Owner | Manager | Dispatcher | Mechanic | Pilot |
|---|---|---|---|---|---|
| Fleet List (`/fleet`) | V,C,E,D | V,C,E | V | V | V |
| Fleet Detail (`/fleet/:id`) | V,E,D(interval) | V,E(interval) | V,E(interval) | V,E(interval) | V |
| Maintenance Intervals | C,E,D | C,E | C,E | C,E | V |
| Work Orders (`/work-orders`) | V,C,E,D | V,C,E | V,C,E | V,C,E | V,C |
| Discrepancies (`/maintenance`) | V,C,E,D | V,C,E | V,C,E | V,C,E | V,C,E(own reports/minimal) |
| Dispatcher (`/dispatcher-dashboard`) | V,C,E,D(flights) | V,C,E | V,C,E | V | V |
| Calendar (`/calendar`) | V,C,E,D(custom events) | V,C,E | V,C,E | V | V |
| Parts (`/parts`) | V,C,E,D | V,C,E | V | V,C,E | V |
| Pilot (`/pilot-dashboard`) | V | V | V | V | V,C,E(own requests/reports) |

## Current Snapshot (from code)

- Frontend routes currently allow:
  - Maintenance + Work Orders: owner/manager/mechanic/dispatcher/pilot
  - Fleet + Fleet Detail: owner/manager/mechanic/dispatcher/pilot
  - Calendar: owner/dispatcher
  - Parts page route: owner/manager/mechanic
- Backend currently allows:
  - Company workorders/discrepancies list: authenticated users in tenant context
  - WorkOrder create: authenticated
  - WorkOrder destroy: owner only
  - Discrepancy create: authenticated
  - Discrepancy destroy: owner only
  - Fleet interval C/E/complete: mechanic/dispatcher/manager/owner
  - Fleet interval delete: owner only

## Gaps To Resolve Next

1. Normalize route-level access for `parts`, `dispatcher`, and `calendar` versus backend permissions.
2. Add object-level rules (for example pilot edit only own discrepancy/request).
3. Remove stale comments/helpers that still imply manager delete rights.
4. Add RBAC integration tests:
   - one positive + one negative per role/module for C/E/D.

## Recommended Next Implementation Slice

1. Lock this matrix as source of truth in code comments + docs.
2. Enforce `owner-only delete` consistently in any remaining backend endpoints.
3. Add `can(role, resource, action)` shared helper on frontend to stop per-page drift.
4. Add DRF permission classes for role+ownership checks where needed.

