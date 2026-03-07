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

### GET /api/profiles/<id>/
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

### GET /api/companies/<id>/
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

### GET /api/management/dashboard/
Returns summary statistics for the authenticated user's company.
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
            "total_aircraft": 5,
            "total_flights": 42,
            "total_discrepancies": 8,
            "total_work_orders": 3
        }
        ```
* Error Response:
    * Code: 401 UNAUTHORIZED — `{ "detail": "Authentication credentials were not provided." }`
    * Code: 403 FORBIDDEN — `{ "error": "User does not have an associated company" }`

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

### GET /api/aircraft/<id>/
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

### GET /api/parts/<id>/
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

### GET /api/discrepancies/<id>/
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

### GET /api/workorders/<id>/
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

### GET /api/flights/<id>/
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