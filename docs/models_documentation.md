# Django Models Documentation

## Overview

This file defines the core data models for a flight operations management system. It covers companies, user profiles, pilots, mechanics, aircraft, parts/inventory, work orders, discrepancies, and flights.

---

## Models

### `Company`

Represents an aviation company. Acts as the top-level owner of users, aircraft, inventory, and flights.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `name` | CharField | Name of the company |
| `locations` | CharField | Optional location info |
| `created_at` | DateTimeField | Auto-set on creation |
| `updated_at` | DateTimeField | Auto-set on update |

**Methods:**

- `availability(start_date, end_date, aircraft_id=None)` — Returns a list of aircraft with no conflicting flights in the given time window. Optionally checks a single aircraft by ID.
- `calendar_flights(start_date, end_date)` — Returns all flights with a departure date within the given range (for day/week/month calendar views).
- `get_management_dashboard_data()` — Returns summary counts: total aircraft, flights, discrepancies, and work orders.
- `get_user_data()` — Returns a list of all users in the company with profile details.
- `get_aircraft_data()` — Returns a list of all aircraft belonging to the company.
- `get_flight_data()` — Returns a list of all flights with full aircraft and scheduling info.
- `get_inventory_data()` — Returns a flat list of all inventory parts across all inventories.
- `get_workorders_data()` — Returns all work orders across all company aircraft.
- `get_discrepancy_data()` — Returns all discrepancies across all company aircraft.
- `get_company_role_data(role)` — Returns all users matching a specific company role.

---

### `Profile`

Extends Django's `AbstractUser`. Represents any user in the system, assigned to a company with a specific role.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `company` | ForeignKey → Company | The company this user belongs to |
| `company_role` | CharField | One of: `owner`, `mechanic`, `dispatcher`, `pilot`, `manager` |
| `middle_name` | CharField | Optional middle name |
| `employee_id` | PositiveIntegerField | Must be unique per company |
| `phone_number` | CharField | 10-character phone number |
| `profile_img` | ImageField | Uploaded to `profile_pics/` |

**Validation (`clean`):**
- Ensures no two users in the same company share the same `employee_id`.

**Save behavior:**
- If `company_role` is `"pilot"`, a `Pilot` record is automatically created via `get_or_create`.
- If `company_role` is `"mechanic"`, a `Mechanic` record is automatically created.

**Methods:**
- `is_mechanic()`, `is_pilot()`, `is_owner()`, `is_manager()` — Boolean role checks.

---

### `Pilot`

A sub-profile for users with the `pilot` company role. Stores certificate and medical clearance information.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `profile` | OneToOneField → Profile | Linked profile (related_name: `pilot_info`) |
| `medically_cleared_until` | DateField | Date through which the pilot is medically cleared |
| `pilot_certificate` | CharField | One of: `none`, `student`, `private`, `commercial`, `airline` |

**Methods:**
- `is_cleared_to_fly(flight_date)` — Returns `True` if the pilot has a valid medical clearance through the given date and holds a non-`none` certificate.
- `is_certified(required)` — Returns `True` if the pilot's certificate level is greater than or equal to the required level (using an internal 0–4 numeric scale).

---

### `Mechanic`

A sub-profile for users with the `mechanic` company role. Stores certification and inspection authority information.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `profile` | OneToOneField → Profile | Linked profile (related_name: `mechanic_info`) |
| `AP_certificate_number` | PositiveIntegerField | FAA A&P certificate number |
| `mechanic_certificate_img` | ImageField | Uploaded to `mechanic_cert/` |
| `inspector_authentication` | BooleanField | Whether the mechanic holds IA authority |
| `authentication_img` | ImageField | Uploaded to `faa_auth/` |

---

### `Aircraft`

Represents an aircraft owned by a company.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `registration_number` | IntegerField | Aircraft N-number or registration |
| `model` | CharField | Aircraft model name |
| `manufacturer` | CharField | Aircraft manufacturer |
| `engine_type` | CharField | Type of engine |
| `year_built` | IntegerField | Year built (1903–9999) |
| `company` | ForeignKey → Company | Owning company (related_name: `aircraft`) |

---

### `Part`

Represents a part associated with a specific aircraft.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `part_number` | CharField | Manufacturer part number |
| `name` | CharField | Human-readable part name |
| `description` | TextField | Optional description |
| `aircraft` | ForeignKey → Aircraft | The aircraft this part belongs to |

---

### `Inventory`

Represents a company's inventory of parts. Parts are linked through the `InventoryPart` through-model.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `company` | ForeignKey → Company | Owning company (related_name: `inventories`) |
| `parts` | ManyToManyField → Part | Via `InventoryPart` through-model |

---

### `InventoryPart`

Through-model between `Inventory` and `Part`. Tracks quantity and stock alert settings for each part in an inventory.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `inventory` | ForeignKey → Inventory | The parent inventory |
| `part` | ForeignKey → Part | The part |
| `quantity` | PositiveIntegerField | Current stock count |
| `stock_alert` | PositiveIntegerField | Threshold for reorder alert |
| `stock_alert_percentage` | FloatField | Warning percentage buffer (0.0–1.0, default 0.10) |
| `shop_location` | CharField | Optional physical location in the shop |

**Methods:**
- `low_stock()` — Returns `True` if the stock alert threshold exceeds the current quantity adjusted by the alert percentage, or if stock is at or below 1.

---

### `WorkOrder`

Represents a maintenance work order for an aircraft.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `aircraft` | ForeignKey → Aircraft | Aircraft being worked on |
| `created_by` | ForeignKey → Profile | User who created the work order |
| `parts_needed` | ManyToManyField → Part | Via `WorkOrderPart` through-model |
| `title` | CharField | Short title |
| `description` | TextField | Full description |
| `status` | CharField | One of: `open`, `in_progress`, `awaiting_parts`, `closed` |
| `due_by` | DateField | Optional deadline |
| `tach_time` | DecimalField | Tachometer time at time of work |
| `hobbs_time` | DecimalField | Hobbs meter time at time of work |
| `ATA_code` | IntegerField | ATA chapter code |
| `components_affected` | CharField | Text description of affected components |
| `components_image` | ImageField | Uploaded to `work_order_components/` |
| `signed_by` | ForeignKey → Profile | Inspector who signed off |
| `signature` | ImageField | Uploaded to `work_order_signatures/` |
| `signature_date` | DateField | Date of sign-off |

---

### `WorkOrderPart`

Through-model between `WorkOrder` and `Part`. Tracks the quantity of each part needed for a work order.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `work_order` | ForeignKey → WorkOrder | The parent work order |
| `part` | ForeignKey → Part | The required part |
| `quantity` | PositiveIntegerField | How many units are needed |

---

### `Discrepancy`

Represents a reported issue or defect on an aircraft. Can optionally be linked to a `WorkOrder` when a fix is in progress.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `work_order` | ForeignKey → WorkOrder | Optional linked work order |
| `aircraft` | ForeignKey → Aircraft | Aircraft with the discrepancy |
| `reporter` | ForeignKey → Profile | User who reported it |
| `date_reported` | DateField | Auto-set on creation |
| `description` | CharField | Short description of the issue |
| `ata_code` | CharField | ATA chapter code |
| `tach_time` | CharField | Tachometer reading at time of report |
| `status` | CharField | Either `pending` or `closed` |

---

### `Flight`

Represents a scheduled flight. Linked to a company, aircraft, pilots, and optionally a dispatcher.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `company` | ForeignKey → Company | Owning company |
| `aircraft` | ForeignKey → Aircraft | Aircraft assigned to the flight |
| `flight_number` | CharField | Flight identifier |
| `origin` | CharField | Departure location |
| `destination` | CharField | Arrival location |
| `departure_time` | DateTimeField | Scheduled departure |
| `arrival_time` | DateTimeField | Scheduled arrival |
| `route` | CharField | Optional route description |
| `flight_type` | CharField | One of: `training`, `charter`, `positioning`, `maintenance ferry` |
| `primary_pilot` | ForeignKey → Profile | Main pilot (related_name: `primary_pilot`) |
| `secondary_pilot` | ForeignKey → Profile | Co-pilot (related_name: `secondary_pilot`) |
| `dispatcher` | ForeignKey → Profile | Optional dispatcher |
| `pilot_requirement` | CharField | Minimum cert level: `student`, `private`, `commercial`, or `airline` |
| `status` | CharField | One of: `scheduled`, `approved`, `pending approval`, `delayed`, `cancelled`, `completed` |

**Validation (`clean`):**

The `clean` method enforces the following rules and raises a `ValidationError` with field-level errors if any fail:

- Primary and secondary pilot cannot be the same person.
- `departure_time` and `arrival_time` must both exist.
- `arrival_time` cannot be before `departure_time`.
- For each pilot (primary and secondary):
  - Must have a `company_role` of `"pilot"`.
  - Must belong to the same company as the flight.
  - Must have an associated `pilot_info` (i.e., a `Pilot` record).
  - Must be medically cleared through at least the arrival date.
  - Must meet or exceed the flight's `pilot_requirement` certification level.

---

## Model Relationships Diagram

```
Company
├── Profile (users)
│   ├── Pilot (pilot_info)        [if company_role == "pilot"]
│   └── Mechanic (mechanic_info)  [if company_role == "mechanic"]
├── Aircraft
│   ├── Part
│   │   └── InventoryPart ─── Inventory ─── Company
│   ├── WorkOrder
│   │   └── WorkOrderPart ─── Part
│   ├── Discrepancy ─── WorkOrder
│   └── Flight
└── Inventory
```
