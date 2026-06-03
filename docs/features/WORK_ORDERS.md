# Work Orders Page

See also: [work_order_flow.md](work_order_flow.md) — end-to-end discrepancy → work order → closure flow.

## Purpose

The Work Orders page provides a focused operations view for work-order management while the Maintenance page remains a mixed view (work orders + discrepancies).

Route: `/work-orders`

## Access (RBAC)

- Owner
- Manager
- Mechanic
- Platform Admin (cross-company visibility with company filter)

## Key Behaviors

- Status tabs: All, Open, In Progress, Awaiting Parts, Closed
- Search and company filtering
- Table includes parts summary, description, assignee/company chips, status, priority, due date, timestamps, discrepancy count
- Pagination and CSV export for currently filtered rows
- Rounded, solid action buttons in a consistent 3-column grid

## Actions

- View
- Edit
- Assign/Reassign (supervisor/admin)
- Start (Open -> In Progress)
- Awaiting Parts (In Progress -> Awaiting Parts)
- Close (non-closed -> Closed)
- Delete (supervisor/admin)

## Priority

Work orders now include priority:

- Low
- Medium
- High
- Critical

Backend field: `WorkOrder.priority`

Migration: `api.0040_workorder_priority`

## Notes

- Status transition and assignment validation are enforced server-side in serializers.
- Activity summaries are humanized for readability.
