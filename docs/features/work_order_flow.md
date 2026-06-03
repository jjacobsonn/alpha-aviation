# Alpha Aviation — Work Order Flow
**Audience:** Development Team | **Scope:** Discrepancy → Work Order → Closure

---

## Overview

A reporter submits a discrepancy → a supervisor converts it to a Work Order → a mechanic resolves it → the system propagates all state changes automatically.

---

## Flow

### 1. Reporter — Submit Discrepancy
- Fills out **New Discrepancy Form**: Aircraft, Date, Tach/Hobbs Time, Description, (optional) ATA Code, Component, Attachment.
- Signs digital acknowledgment and submits.

**System:** Creates a `Pending Maintenance` record. Sets aircraft color indicator (Red if overdue).

---

### 2. System — Dashboard Auto-Update
- Pending Maintenance table gains a new row (sorted to top).
- KPI counters increment: **Pending Maintenance**, **Open Work Orders**, **Overdue**, **Due Soon**.
- Aircraft List reflects updated Red/Amber status if thresholds are met.

---

### 3. Supervisor — Open Work Order
- From the Dashboard, clicks **Open WO** on the discrepancy row.
- Lands on **New Work Order Form** pre-filled with discrepancy data.
- Enters Title/Scope, optional Assignee, Priority, and creates the WO.

**System:** Creates a linked `Work Order` record with status `Open`.

---

### 4. Mechanic — Work the WO
- Updates WO status: `Open` → `In Progress`.
- Adds notes and attachments as work proceeds.
- *(Optional)* Sets status to `Awaiting Parts` if a part is unavailable.
- On completion, clicks **Close WO** and enters Completion Notes.

---

### 5. System — Close & Propagate
- Linked Discrepancy auto-closes.
- Aircraft List color recalculates (Green if no remaining due/critical items).
- A record is written to **Maintenance History**.
- Dashboard KPI counters decrement; item removed from Open WOs table and appears in Maintenance History.

---

## State Transitions

| Entity | States |
|---|---|
| Discrepancy | `Pending` → `Closed` |
| Work Order | `Open` → `In Progress` → `Awaiting Parts` *(optional)* → `Closed` |
| Aircraft Indicator | `Green` / `Amber` / `Red` (recalculated on create & close) |

---

## Key Backend Triggers

| Event | Side Effects |
|---|---|
| Discrepancy submitted | Create `PendingMaintenance` record, recalculate aircraft color |
| WO created | Link to discrepancy, set status `Open`, increment dashboard counters |
| WO closed | Auto-close discrepancy, write `MaintenanceHistory`, recalculate aircraft color, decrement counters |
