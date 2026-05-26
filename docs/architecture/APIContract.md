# API Contract

---

# Auth

### POST /api/auth/login/
Authenticates a user and returns JWT tokens.
* URL Params: None
* Data Params: `{ "username": string, "password": string }`
* Headers: `Content-Type: application/json`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "access": "<jwt_access_token>",
            "refresh": "<jwt_refresh_token>",
            "user": {
                "id": 1,
                "username": "jdoe",
                "email": "jdoe@example.com"
            }
        }
        ```
* Error Response:
    * Code: 400 BAD REQUEST — `{ "error": "Username and password are required" }`
    * Code: 401 UNAUTHORIZED — `{ "error": "Invalid credentials" }`

---

### POST /api/auth/token/refresh/
Returns a new access token given a valid refresh token.
* URL Params: None
* Data Params: `{ "refresh": string }`
* Headers: `Content-Type: application/json`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "access": "<new_jwt_access_token>",
            "refresh": "<new_jwt_refresh_token>"
        }
        ```
* Error Response:
    * Code: 400 BAD REQUEST — `{ "error": "Refresh token is required" }`
    * Code: 401 UNAUTHORIZED — `{ "error": "Invalid or expired refresh token" }`

---

### POST /api/auth/logout/
Blacklists the provided refresh token, logging the user out.
* URL Params: None
* Data Params: `{ "refresh": string }`
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content: `{ "message": "Logout successful" }`
* Error Response:
    * Code: 400 BAD REQUEST — `{ "error": "<error detail>" }`

---

# Health

### GET /api/health/
Health check endpoint. No authentication required.
* URL Params: None
* Data Params: None
* Headers: None
* Success Response:
    * Code: 200
    * Content: `{ "status": "ok" }`

---

# Profile

Profile object
```
{
    id: int
    username: string
    first_name: string
    last_name: string
    middle_name: string (max_length=150)
    profile_img: image (file type unrestricted)
    email: string
    employee_id: positive int
    phone_number: positive int (max_length=10)
    company: <ForeignKey Company>
    company_role: string (choices: 'owner', 'mechanic', 'dispatcher', 'pilot', 'manager')

    # Pilot only — omitted if user is not a pilot
    medically_cleared_until: date (YYYY-MM-DD)
    pilot_certificate: string (choices: 'none', 'student', 'private', 'commercial', 'airline')

    # Mechanic only — omitted if user is not a mechanic
    AP_certificate_number: positive int
    inspector_authentication: bool
    mechanic_certificate_img: image (file type unrestricted)
    authentication_img: image (file type unrestricted)
}
```

### GET /api/profiles/
Returns all profiles in the system.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "username": "jdoe",
                "first_name": "John",
                "last_name": "Doe",
                "middle_name": "Michael",
                "profile_img": "http://example.com/media/profile_pics/jdoe.jpg",
                "email": "jdoe@example.com",
                "employee_id": 1001,
                "phone_number": 5555555555,
                "company": 1,
                "company_role": "pilot",
                "medically_cleared_until": "2026-12-01",
                "pilot_certificate": "commercial"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/profiles/\<id\>/
Returns a single profile by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "username": "jdoe",
            "first_name": "John",
            "last_name": "Doe",
            "middle_name": "Michael",
            "profile_img": "http://example.com/media/profile_pics/jdoe.jpg",
            "email": "jdoe@example.com",
            "employee_id": 1001,
            "phone_number": 5555555555,
            "company": 1,
            "company_role": "pilot",
            "medically_cleared_until": "2026-12-01",
            "pilot_certificate": "commercial"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Profile matches the given query." }`

---

### GET /api/users/me/
Returns the profile of the currently authenticated user.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "username": "jdoe",
            "email": "jdoe@example.com",
            "first_name": "John",
            "last_name": "Doe"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

# Company

Company object
```
{
    id: int
    name: string (max_length=255)
    created_at: datetime
    updated_at: datetime
    locations: string (optional)
}
```

### GET /api/companies/
Returns all companies in the system.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "name": "Acme Aviation",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-06-01T00:00:00Z",
                "locations": "Salt Lake City, UT"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/companies/\<id\>/
Returns a single company by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "name": "Acme Aviation",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-06-01T00:00:00Z",
            "locations": "Salt Lake City, UT"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Company matches the given query." }`



---

### GET /api/company/users/
Returns all users belonging to the authenticated user's company
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id":1,
                "profile_img": "http://example.com/media/profile_pics/jdoe.jpg",
                "username": "jdoe",
                "first_name": "John",
                "middle_name": "Michael",
                "last_name": "Doe",
                "email": "jdoe@example.com",
                "employee_id": 1001,
                "phone_number": 5555555555,
                "company_role": "pilot"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`

---

### GET /api/company/aircrafts/
Returns all aircraft belonging to the authenticated user's company
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "registration_number": 12345,
                "model": "Cessna 172",
                "manufacturer": "Cessna",
                "engine_type": "Lycoming O-320",
                "year_built": 2005
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`
---

### GET /api/company/flights/
Returns all flights belonging to the authenticated user's company
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "flight_number": "ACM-001",
                "aircraft_id": 1,
                "aircraft_manufacturer": "Cessna",
                "aircraft_model": "Cessna 172",
                "aircraft_registration": 12345,
                "aircraft_engine_type": "Lycoming O-320",
                "aircraft_year_built": 2005,
                "origin": "KSLC",
                "destination": "KOGD",
                "departure_time": "2026-03-10T09:00:00Z",
                "arrival_time": "2026-03-10T10:30:00Z",
                "route": "Direct",
                "flight_type": "training",
                "pilot_requirement": "private",
                "status": "scheduled"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`
---

### GET /api/company/inventories/
Returns all inventories belonging to the authenticated user's company
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "part_number": "PN-1234",
                "name": "Oil Filter",
                "description": "Standard oil filter for Lycoming engines",
                "aircraft": "Cessna 172",
                "quantity": 5,
                "stock_alert": 2,
                "stock_alert_percentage": 0.1,
                "shop_location": "Shelf A3"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`
---

### GET /api/company/workorders/
Returns all workorders belonging to the authenticated user's company
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "title": "Missing an engine",
                "created_by": [
                    "Kyle",
                    "Bluemel"
                ],
                "description": "There is not an engine",
                "parts_needed": [
                    {
                        "name": "Bolt",
                        "quantity": 2
                    },
                    {
                        "name": "Hose clamp",
                        "quantity": 4
                    }
                ],
                "status": "open",
                "created_at": "2026-02-18T17:50:15.007901Z",
                "updated_at": "2026-03-09T18:34:59.762609Z",
                "due_by": "2026-03-09",
                "aircraft": {
                    "registration_number": 1,
                    "model": "first"
                },
                "tach_time": 324.0,
                "hobbs_time": 666.0,
                "ATA_code": 33423,
                "components_affected": "engine",
                "components_image": "/work_order_components/engine.jpg",
                "signed_by": [
                    "Kyle",
                    "Bluemel"
                ],
                "signature": "/work_order_signatures/engine.jpg",
                "signature_date": "2026-03-09"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`
---

### GET /api/company/role/
Returns all users that have the given role that belongs to the authenticated user's company
* URL Params: role = profile.role_choices#currently is 'owner', 'mechanic', 'dispatcher', 'pilot' or 'manager'
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "profile_img": null,
                "username": "Kyle",
                "first_name": "Kyle",
                "middle_name": "Steven",
                "last_name": "Bluemel",
                "email": "10947011@uvu.edu",
                "employee_id": 3,
                "phone_number": "8014208071",
                "company_role": "pilot"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`
    * Code: 400 BAD REQUEST — `{'error': 'Role parameter is required'}`
    * Code: 400 BAD REQUEST — `{'error': 'Given role is not a valid role.'}`

---

# Aircraft

Aircraft object
```
{
    id: int
    registration_number: int
    model: string (max_length=200)
    manufacturer: string (max_length=200)
    engine_type: string (max_length=200, optional)
    year_built: int (min=1903, max=9999)
    company: <ForeignKey Company>
    company_name: string (read-only display field)
}
```

### GET /api/aircraft/
Returns all aircraft in the system.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "registration_number": 12345,
                "model": "Cessna 172",
                "manufacturer": "Cessna",
                "engine_type": "Lycoming O-320",
                "year_built": 2005,
                "company": 1,
                "company_name": "Acme Aviation"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/aircraft/\<id\>/
Returns a single aircraft by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "registration_number": 12345,
            "model": "Cessna 172",
            "manufacturer": "Cessna",
            "engine_type": "Lycoming O-320",
            "year_built": 2005,
            "company": 1,
            "company_name": "Acme Aviation"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Aircraft matches the given query." }`

---

### GET /api/aircraft/availability/
Returns aircraft available within the given datetime range. Optionally filter by a specific aircraft.
* URL Params:
    * Required: `start_date=[datetime string]`, `end_date=[datetime string]`
    * Optional: `aircraft_id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "registration_number": 12345,
                "model": "Cessna 172",
                "manufacturer": "Cessna",
                "engine_type": "Lycoming O-320",
                "year_built": 2005,
                "company": 1,
                "company_name": "Acme Aviation"
            }
        ]
        ```
    * Returns `[]` if no aircraft are available or if the specific aircraft is unavailable.
* Error Response:
    * Code: 400 BAD REQUEST — `{ "error": "start_date and end_date are required" }`
    * Code: 400 BAD REQUEST — `{ "error": "start_date must be before end_date" }`
    * Code: 400 BAD REQUEST — `{ "error": "aircraft_id must be an integer" }`
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`

---

# Parts

Part object
```
{
    id: int
    part_number: string (max_length=200)
    name: string (max_length=200)
    description: string (optional)
    aircraft: <ForeignKey Aircraft>
    aircraft_name: string (read-only display field)
}
```

### GET /api/parts/
Returns all parts in the system.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "part_number": "PN-1234",
                "name": "Oil Filter",
                "description": "Standard oil filter for Lycoming engines",
                "aircraft": 1,
                "aircraft_name": "Cessna 172"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/parts/\<id\>/
Returns a single part by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "part_number": "PN-1234",
            "name": "Oil Filter",
            "description": "Standard oil filter for Lycoming engines",
            "aircraft": 1,
            "aircraft_name": "Cessna 172"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Part matches the given query." }`

---

# Discrepancies

Discrepancy object
```
{
    id: int
    work_order: <ForeignKey WorkOrder> (optional)
    aircraft: <ForeignKey Aircraft>
    reporter: <ForeignKey Profile> (optional)
    reporter_name: string (read-only display field)
    date_reported: date (YYYY-MM-DD, auto set on create)
    description: string (max_length=200)
    ata_code: string (max_length=50, optional)
    tach_time: string (max_length=100, optional)
    status: string (choices: 'pending', 'closed')
    signature: image (file type unrestricted, optional)
    signature_date: date (YYYY-MM-DD, optional)
}
```

### GET /api/discrepancies/
Returns all discrepancies ordered by most recently reported.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "work_order": null,
                "aircraft": 1,
                "reporter": 2,
                "reporter_name": "jdoe",
                "date_reported": "2026-03-01",
                "description": "Hydraulic leak observed near landing gear",
                "ata_code": "32",
                "tach_time": "1023.4",
                "status": "pending"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/discrepancies/\<id\>/
Returns a single discrepancy by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "work_order": null,
            "aircraft": 1,
            "reporter": 2,
            "reporter_name": "jdoe",
            "date_reported": "2026-03-01",
            "description": "Hydraulic leak observed near landing gear",
            "ata_code": "32",
            "tach_time": "1023.4",
            "status": "pending"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Discrepancy matches the given query." }`

---

### POST /api/discrepancies/\<id\>/open_work_order/
Creates a new Work Order pre-filled from the discrepancy and links them together.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 201
    * Content: WorkOrder object (same as GET /api/workorders/\<id\>/)
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — insufficient role
    * Code: 404 NOT FOUND — `{ "detail": "No Discrepancy matches the given query." }`

---

# Work Orders

WorkOrder object
```
{
    id: int
    title: string (max_length=200)
    created_by: <ForeignKey Profile> (optional)
    description: string (optional)
    parts_needed: [<ManyToMany Part>] (optional)
    status: string (choices: 'open', 'in_progress', 'awaiting_parts', 'closed')
    created_at: datetime (auto set on create)
    updated_at: datetime (auto updated)
    due_by: date (YYYY-MM-DD, optional)
    aircraft: <ForeignKey Aircraft>
    tach_time: decimal (optional)
    hobbs_time: decimal (optional)
    ATA_code: int (optional)
    components_affected: string (max_length=200, optional)
    components_image: image (file type unrestricted, optional)
    signed_by: <ForeignKey Profile> (optional)
    signature: image (file type unrestricted, optional)
    signature_date: date (YYYY-MM-DD, optional)
    assignee: <ForeignKey Profile> (optional)
    priority: string (choices: 'low', 'medium', 'high', 'critical', default: 'medium')
    completion_notes: string (optional)
}
```

### GET /api/workorders/
Returns all work orders ordered by most recently created.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "title": "Landing Gear Inspection",
                "created_by": 2,
                "description": "Inspect and repair hydraulic leak",
                "parts_needed": [1, 2],
                "status": "open",
                "created_at": "2026-03-01T10:00:00Z",
                "updated_at": "2026-03-01T10:00:00Z",
                "due_by": "2026-03-15",
                "aircraft": 1,
                "tach_time": "1023.40",
                "hobbs_time": "1100.00",
                "ATA_code": 32,
                "components_affected": "Landing gear hydraulic line",
                "components_image": null,
                "signed_by": null,
                "signature": null,
                "signature_date": null
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/workorders/\<id\>/
Returns a single work order by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "title": "Landing Gear Inspection",
            "created_by": 2,
            "description": "Inspect and repair hydraulic leak",
            "parts_needed": [1, 2],
            "status": "open",
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z",
            "due_by": "2026-03-15",
            "aircraft": 1,
            "tach_time": "1023.40",
            "hobbs_time": "1100.00",
            "ATA_code": 32,
            "components_affected": "Landing gear hydraulic line",
            "components_image": null,
            "signed_by": null,
            "signature": null,
            "signature_date": null
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No WorkOrder matches the given query." }`

---

### POST /api/workorders/\<id\>/close/
Closes a Work Order, records the signer, and auto-closes all linked discrepancies.
* URL Params: `id=[integer]`
* Data Params: `{ "completion_notes": string }` (optional)
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Manager, Owner, or Mechanic with `inspector_authentication = True`
* Success Response:
    * Code: 200
    * Content: WorkOrder object with `status: "closed"`, `signed_by`, and `signature_date` populated
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — insufficient role or mechanic lacks inspector authentication
    * Code: 404 NOT FOUND — `{ "detail": "No WorkOrder matches the given query." }`

---

### GET /api/aircraft/\<id\>/work_order_history/
Returns all work orders for a specific aircraft ordered by most recently created.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content: Array of WorkOrder objects (same as GET /api/workorders/)
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Aircraft matches the given query." }`

---

### GET /api/maintenance/dashboard/
Returns KPI counters for the authenticated user's company scoped to maintenance.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "pending_discrepancies": 4,
            "open_work_orders": 7,
            "overdue": 2,
            "due_soon": 3
        }
        ```
    * `overdue` — open WOs with a `due_by` date in the past
    * `due_soon` — open WOs with a `due_by` date within the next 10 days
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — insufficient role

---

# Flights

Flight object
```
{
    id: int
    company: <ForeignKey Company>
    company_name: string (read-only display field)
    aircraft: <ForeignKey Aircraft>
    aircraft_name: string (read-only display field)
    flight_number: string (max_length=250, optional)
    origin: string (max_length=250, optional)
    destination: string (max_length=250, optional)
    departure_time: datetime
    arrival_time: datetime
    route: string (optional)
    flight_type: string (choices: 'training', 'charter', 'positioning', 'maintenance ferry')
    primary_pilot: <ForeignKey Profile>
    secondary_pilot: <ForeignKey Profile>
    pilot_requirement: string (choices: 'student', 'private', 'commercial', 'airline')
    status: string (choices: 'scheduled', 'approved', 'pending approval', 'delayed', 'cancelled', 'completed')
}
```

### GET /api/flights/
Returns all flights ordered by most recent departure time.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "company": 1,
                "company_name": "Acme Aviation",
                "aircraft": 1,
                "aircraft_name": "Cessna 172",
                "flight_number": "ACM-001",
                "origin": "KSLC",
                "destination": "KOGD",
                "departure_time": "2026-03-10T09:00:00Z",
                "arrival_time": "2026-03-10T10:30:00Z",
                "route": "Direct",
                "flight_type": "training",
                "primary_pilot": 2,
                "secondary_pilot": 3,
                "pilot_requirement": "private",
                "status": "scheduled"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/flights/\<id\>/
Returns a single flight by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "company": 1,
            "company_name": "Acme Aviation",
            "aircraft": 1,
            "aircraft_name": "Cessna 172",
            "flight_number": "ACM-001",
            "origin": "KSLC",
            "destination": "KOGD",
            "departure_time": "2026-03-10T09:00:00Z",
            "arrival_time": "2026-03-10T10:30:00Z",
            "route": "Direct",
            "flight_type": "training",
            "primary_pilot": 2,
            "secondary_pilot": 3,
            "pilot_requirement": "private",
            "status": "scheduled"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Flight matches the given query." }`

---
### POST /api/flights/
Creates a new flight. Runs full validation on save.
* URL Params: None
* Data Params:
```json
    {
        "company": 1,
        "aircraft": 1,
        "flight_number": "ACM-002",
        "origin": "KSLC",
        "destination": "KOGD",
        "departure_time": "2026-04-01T09:00:00Z",
        "arrival_time": "2026-04-01T10:30:00Z",
        "route": "Direct",
        "flight_type": "charter",
        "primary_pilot": 2,
        "secondary_pilot": 3,
        "dispatcher": 4,
        "pilot_requirement": "commercial",
        "status": "scheduled"
    }
```
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 201
    * Content: Flight object (same as GET /api/flights/<id>/)
* Error Response:
    * Code: 400 BAD REQUEST — validation failed:
```json
        {
            "departure_time": ["Departure time does not exist"],
            "arrival_time": ["Arrival time can not be before departure time."],
            "secondary_pilot": ["Secondary pilot cannot be the same person as Primary pilot!"],
            "primary_pilot": ["Kyle is not a pilot"],
            "primary_pilot": ["Kyle is not of company Acme Aviation"],
            "primary_pilot": ["Kyle is not cleared to fly until 2026-04-01"],
            "primary_pilot": ["Kyle is not a high enough certification"],
            "aircraft": ["1 (Cessna 172) has pending work orders."],
            "aircraft": ["1 (Cessna 172) has a conflicting flight"]
        }
```
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### PUT /api/flights/\<id\>/
Full update of a flight. Runs full validation on save.
* URL Params: `id=[integer]`
* Data Params: Full Flight object (same as POST)
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content: Flight object (same as GET /api/flights/<id>/)
* Error Response:
    * Code: 400 BAD REQUEST — validation errors (same as POST)
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Flight matches the given query." }`

---

### PATCH /api/flights/\<id\>/
Partial update of a flight. Runs full validation on save.
* URL Params: `id=[integer]`
* Data Params: Any subset of Flight fields
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content: Flight object (same as GET /api/flights/<id>/)
* Error Response:
    * Code: 400 BAD REQUEST — validation errors (same as POST)
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Flight matches the given query." }`

---

### DELETE /api/flights/\<id\>/
Deletes a flight.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 204 NO CONTENT
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Flight matches the given query." }`
---

### GET /api/flights/calendar/
Returns all flights whose departure date falls within the given date range. Optionally filter by aircraft.
* URL Params:
    * Required: `start_date=[date string YYYY-MM-DD]`, `end_date=[date string YYYY-MM-DD]`
    * Optional: `aircraft_id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Success Response:
    * Code: 200
    * Content: Array of Flight objects (same as GET /api/flights/)
* Error Response:
    * Code: 400 BAD REQUEST — `{ "error": "start_date and end_date are required" }`
    * Code: 400 BAD REQUEST — `{ "error": "start_date must be before end_date" }`
    * Code: 400 BAD REQUEST — `{ "error": "aircraft_id must be an integer" }`
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`

---

# Tool & Equipment Management

Tool object
```
{
    id: int
    company: <ForeignKey Company>
    name: string (max_length=200)
    description: string (optional)
    serial_number: string (max_length=200)
    calibration_due_date: date (YYYY-MM-DD)
    location: string (max_length=200, optional)
    calibration_alert: string (read-only, computed: "green" | "amber" | "red")
    status: string (read-only, computed: "available" | "calibration_due" | "overdue")
}
```
Alert thresholds (computed from `calibration_due_date`):
* `green` — due date is more than 10 days away
* `amber` — due date is within 10 days
* `red` — due date has passed

CalibrationRecord object
```
{
    id: int
    tool: <ForeignKey Tool> (read-only)
    calibration_date: date (YYYY-MM-DD)
    performed_by: string (max_length=200, free-text vendor/company name)
    next_due_date: date (YYYY-MM-DD)
    notes: string (optional)
}
```

---

### GET /api/company/tools/
Returns all tools belonging to the authenticated user's company.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "company": 1,
                "name": "Torque Wrench",
                "description": "3/8 drive torque wrench",
                "serial_number": "TW-M350012",
                "calibration_due_date": "2026-11-12",
                "location": "Tool Crib A",
                "calibration_alert": "green",
                "status": "available"
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`

---

### GET /api/tools/
Returns all tools scoped to the authenticated user's company.
* URL Params: None
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 200
    * Content: Array of Tool objects (same as GET /api/company/tools/)
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### POST /api/tools/
Creates a new tool for the authenticated user's company.
* URL Params: None
* Data Params:
    ```json
    {
        "name": "Torque Wrench",
        "description": "3/8 drive torque wrench",
        "serial_number": "TW-M350012",
        "calibration_due_date": "2026-11-12",
        "location": "Tool Crib A"
    }
    ```
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 201
    * Content: Tool object (same as GET /api/tools/<id>/)
* Error Response:
    * Code: 400 BAD REQUEST — validation errors
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`

---

### GET /api/tools/\<id\>/
Returns a single tool by ID.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 200
    * Content:
        ```json
        {
            "id": 1,
            "company": 1,
            "name": "Torque Wrench",
            "description": "3/8 drive torque wrench",
            "serial_number": "TW-M350012",
            "calibration_due_date": "2026-11-12",
            "location": "Tool Crib A",
            "calibration_alert": "green",
            "status": "available"
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Tool matches the given query." }`

---

### PUT /api/tools/\<id\>/
Full update of a tool.
* URL Params: `id=[integer]`
* Data Params: Full Tool object (same fields as POST)
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 200
    * Content: Tool object (same as GET /api/tools/<id>/)
* Error Response:
    * Code: 400 BAD REQUEST — validation errors
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Tool matches the given query." }`

---

### PATCH /api/tools/\<id\>/
Partial update of a tool.
* URL Params: `id=[integer]`
* Data Params: Any subset of Tool fields
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 200
    * Content: Tool object (same as GET /api/tools/<id>/)
* Error Response:
    * Code: 400 BAD REQUEST — validation errors
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Tool matches the given query." }`

---

### DELETE /api/tools/\<id\>/
Deletes a tool and all associated calibration records.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 204 NO CONTENT
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Tool matches the given query." }`

---

### POST /api/tools/\<id\>/record_calibration/
Logs a calibration event for a tool and updates the tool's next calibration due date.
* URL Params: `id=[integer]`
* Data Params:
    ```json
    {
        "calibration_date": "2026-04-18",
        "performed_by": "J.A. King Calibration Services",
        "next_due_date": "2027-04-18",
        "notes": "Passed all tolerance checks."
    }
    ```
    * `notes` is optional
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 201
    * Content:
        ```json
        {
            "id": 1,
            "tool": 1,
            "calibration_date": "2026-04-18",
            "performed_by": "J.A. King Calibration Services",
            "next_due_date": "2027-04-18",
            "notes": "Passed all tolerance checks."
        }
        ```
    * Side effect: `tool.calibration_due_date` is updated to `next_due_date`
* Error Response:
    * Code: 400 BAD REQUEST — validation errors
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Tool matches the given query." }`

---

### GET /api/tools/\<id\>/calibration_history/
Returns all calibration records for a tool, ordered most recent first.
* URL Params: `id=[integer]`
* Data Params: None
* Headers:
    * `Content-Type: application/json`
    * `Authorization: Bearer <access_token>`
* Permission: Mechanic, Manager, or Owner
* Success Response:
    * Code: 200
    * Content:
        ```json
        [
            {
                "id": 1,
                "tool": 1,
                "calibration_date": "2026-04-18",
                "performed_by": "J.A. King Calibration Services",
                "next_due_date": "2027-04-18",
                "notes": "Passed all tolerance checks."
            }
        ]
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 404 NOT FOUND — `{ "detail": "No Tool matches the given query." }`