# Software Design Document (SDD)

## 1. Introduction
- **Purpose**: The purpose of this document is to define the design of the AIMS Next web app system, as created during the Alpha Aviation project.
- **Scope**: The objective of this project is to create a minimum viable product (MVP) implementing the core functionality of the website as outlined by the client and their requirement specifications.
- **References**:
  - [Alpha Aviation - Modules Details](https://uvu365-my.sharepoint.com/:b:/r/personal/10925443_uvu_edu/Documents/Microsoft%20Teams%20Chat%20Files/Alpha%20Aviation_Module%20Details%20(2).pdf?csf=1&web=1&e=YVlq2g)
  - [Team Member Assignment to Deliverables with Module Details](https://uvu365-my.sharepoint.com/:b:/r/personal/10925443_uvu_edu/Documents/Microsoft%20Teams%20Chat%20Files/Phase%202%20Team%20Member%20Assignment%20to%20Deliverables%20with%20Module%20Details%20(2).pdf?csf=1&web=1&e=kGNxak)
  - [API Contract](APIContract.md)

---

## 2. System Overview
- **System Description**: AIMS Next is designed to be a modern replacement for the old flight management apps, making managing the complex systems that go into managing aircrafts and flights quicker, easier, and more reliable. 
- **Design Goals**: Scalability, modularization, and consistent reliability
- **Architecture Summary**: Three-tier web app: React web client + Modular monolith (Django REST API) + PostgreSQL database.

---

## 3. Architectural Design
- **Component Breakdown**
  - **Frontend client**: a React single-page app responsible for UI, routing, and user interactions.
  - **API/application**: a Django REST backend exposing auth endpoints and domain endpoints through one API surface.
  - **Domain model**: core aviation/business entities and rules (company, profiles/users, aircraft, flights, inventory, work orders, discrepancies).
  - **Auth and access control**: JWT-based login/refresh flow plus backend permission controls, with frontend token handling and refresh logic.
  - **Data persistence**: PostgreSQL as the primary datastore, schema managed through Django migrations.
  - **Infrastructure/deployment**: three deployed services working together (React static site, Django web service, PostgreSQL database). 
- **Technology Stack**
    - Frontend: React.js, unit testing with Jest
    - Backend: Django with Python, unit testing with Pytest
    - Database: PostgreSQL with Django migrations

---

## 4. Detailed Design

### Frontend client
- **Responsibilities**: Visual design, UI/UX, page routing.
- **Interfaces/APIs**:
  - Inputs: User actions (clicks, form submissions, navigation), JWT tokens from local storage, JSON responses from backend endpoints.
  - Outputs: Rendered pages/components, API requests to backend, token updates in local storage, user-facing validation/error messages.
  - Error Handling: Centralized API error parsing; unauthorized responses trigger token refresh, then logout/redirect to login if refresh fails; network failures show user-friendly messages.
- **Data Structures**: Context state object with authentication flags, user profile fields, page title, site alerts, and monthly stats; request/response payload objects for auth and domain data.
- **Algorithms/Logic**: Client-side route transitions (SPA), request interceptor to attach bearer token, response interceptor queue for concurrent token refresh retries, reducer-based state transitions.
- **State Management**: React Context + useReducer for global app state; local component state for page-level forms and filters; persistent auth state via local storage.
- Token handling: the frontend stores `accessToken` and `refreshToken` in `localStorage` and uses an axios request/response interceptor to attach the bearer token, queue concurrent requests while a refresh is in progress, automatically POST to `/auth/token/refresh/` to rotate tokens, and force a logout on refresh failure.
- Also see: [Frontend documentation](..\frontend\README.md)

### API/application
- **Responsibilities**: Provides Django REST API endpoints for authentication, domain resources, and company-scoped operations.
- **Interfaces/APIs**: (see [API contract document](APIContract.md))
  - Inputs: HTTP requests (JSON body, query params, auth headers), validated serializer data, authenticated user context.
  - Outputs: JSON responses with resource data, domain summaries, and standardized HTTP status codes (200/201/400/401/403/404).
  - Error Handling: Explicit request validation (missing/invalid params), serializer validation errors, permission failures, invalid credentials/tokens, business-rule checks (for example invalid role or date ranges).
- **Data Structures**: DRF serializers for Company, Profile, Aircraft, Part, Discrepancy, WorkOrder, Flight, Inventory and additional models listed below; URL routing via function endpoints plus ViewSet endpoints.
  - See [serializers](..\backend\api\serializers.py), [views](..\backend\api\views.py)
- **Algorithms/Logic**: Company scoping filters, role-gated endpoint access, date-range parsing and checks, queryset optimization with related-object loading, mixed endpoint style (function-based + class-based APIs).
- **State Management**: Stateless request/response processing on the server; persistent application state stored in PostgreSQL; authentication state represented by JWT access and refresh tokens.
- Also see: [API contract](APIContract.md)

### Domain model
- **Responsibilities**: Encapsulates core aviation business entities and rules for users, company operations, maintenance, scheduling, and inventory.
- **Interfaces/APIs**:
  - Inputs: Model field values, related entity references, datetime/date parameters for availability and calendar queries.
  - Outputs: ORM model instances, related query results, and computed summaries for company-scoped operations.
  - Error Handling: Model-level and serializer-level validation, plus database integrity constraints for invalid or conflicting data.
- **Data Structures**: Relational models including Company, Profile, Aircraft, Flight, Part, Inventory, WorkOrder, and Discrepancy, with foreign-key relationships.
  - See [models](..\backend\api\models.py), [migrations](..\backend\api\migrations)
- **Algorithms/Logic**: Aircraft availability overlap checks, date-window flight filtering, low-stock detection logic, and role-specific profile serialization behavior.
- **State Management**: Canonical domain state is persisted in PostgreSQL through Django ORM and migrations; no in-memory domain state is assumed between requests.
- Also see: [Models documentation](models_documentation.md)

### Auth and access control
- **Responsibilities**: Role-based access control (RBAC) and login account authorization.
- **Interfaces/APIs**:
  - Inputs: Auth API requests (login, refresh, logout), JWT tokens from local storage, user account details from database
  - Outputs: JWT token handling, authorization context, appropriately filtered resources by role
  - Error Handling: Structured HTTP errors for auth failures (400 for invalid input, 401 for invalid credentials/tokens, 403 for missing permissions), DRF permission checks plus view-level guard clauses for business-specific auth errors, token paths 
- **Data Structures**: Relational models for profiles/roles and companies, permissions classes encapsulating reusable policy rules
  - See [permissions](..\backend\api\permissions.py), [serializers](..\backend\api\serializers.py)
- **Algorithms/Logic**: Layered authorization pattern: authenticate JWT/session -> verify company membership -> authorize by permissible roles -> object-level ownership/company checks if applicable. Platform admins can use `X-Company-Id` to act in a selected tenant context for many admin workflows.
- **State Management**: Primarily stateless backend auth via short-lived access tokens plus refresh token rotation; authorization state (company, role, admin) persisted in DB; frontend maintains current auth/role context in app state and uses route guards plus users/me hydration after login to drive role-based navigation.
- **Auth endpoints & behavior**: The API exposes explicit auth endpoints used by the frontend:
  - `POST /auth/login/` — request `{username,password}`; response includes `access` and `refresh` tokens and a small `user` object.
  - `POST /auth/token/refresh/` — request `{refresh}`; response returns a rotated `access` and `refresh` token pair.
  - `POST /auth/logout/` — request `{refresh}`; server blacklists the refresh token.
  Tokens are rotated and refresh tokens are blacklisted on rotation (see backend `SIMPLE_JWT` settings in `backend/config/settings.py`).
- **Platform-admin tenant selection header**: Platform admins may set `X-Company-Id` to select a tenant context for scoped queries; many endpoints honor this header (the frontend sets `X-Company-Id` when `adminCompanyId` is present in local storage).
- Also see: [RBAC Plan](RBAC_PLAN.md), [Superuser and admins](SUPERUSER_AND_ADMINS.md), [Role dashboard roadmap](ROLE_DASHBOARD_ROADMAP.md)

### Data persistence
- **Responsibilities**: Persists and queries application data, enforces schema constraints, and manages schema evolution through migrations.
- **Interfaces/APIs**:
  - Inputs: Django ORM CRUD operations, migration definitions, and environment-based database connection settings.
  - Outputs: Relational records, querysets, transactional writes, and migration history.
  - Error Handling: Constraint violations, validation failures, missing relations, and migration conflict handling through Django migration workflow.
- **Data Structures**: PostgreSQL relational schema generated from Django models and migration files, including foreign keys and indexed fields.
  - See [models](..\backend\api\models.py), [serializers](..\backend\api\serializers.py), [migrations](..\backend\api\migrations)
- **Algorithms/Logic**: Company-scoped filtering, ordered result sets for operational views, and selective related-object loading for performance.
- **State Management**: Durable application state is centralized in PostgreSQL; schema version state is tracked in Django migration metadata.
- Also see: [DB schema diagram](my_db_diagram.png)

### Infrastructure/deployment
- **Responsibilities**: Builds, hosts, and connects frontend, backend, and database services across development and production environments.
- **Interfaces/APIs**:
  - Inputs: Git commits, build/start commands, environment variables, and inbound HTTP traffic.
  - Outputs: Deployed static frontend, running Django API/admin service, connected PostgreSQL instance, and service logs.
  - Error Handling: Service restart/redeploy behavior, startup validation through migration/static-collection commands, and backend HTTP error responses.
- **Data Structures**: Service configuration for three deployable units (static site, web service, database), environment variable maps, and SPA rewrite rules.
- **Algorithms/Logic**: Separation of build-time and runtime steps, startup migration/static workflow, and frontend/backend origin coordination with CORS.
- **State Management**: Runtime services are mostly stateless; persistent application data state lives in PostgreSQL; deployment configuration state is managed by the hosting platform.
- Also see: [Deployment documentation](DEPLOYMENT.md), [Merge guide](MERGE_GUIDE.md)

---

## 5. Database Design
[ER/Schema Diagram](my_db_diagram.png)
- **Tables/Collections**:
  - `Company`: `name`, `locations`, `created_at`, `updated_at`; company is the top-level tenant for operational data.
  - `Profile`: custom Django auth user with `company`, `company_role`, `middle_name`, `employee_id`, `phone_number`, `profile_img`; `employee_id` is validated to be unique within a company.
  - `Pilot`: one-to-one extension of `Profile` for pilots with `medically_cleared_until` and `pilot_certificate`.
  - `Mechanic`: one-to-one extension of `Profile` for mechanics with `AP_certificate_number`, `mechanic_certificate_img`, `inspector_authentication`, and `authentication_img`.
  - `Aircraft`: `registration_number`, `model`, `manufacturer`, `engine_type`, `year_built`, `company`.
  - `Part`: `part_number`, `name`, `description`, `aircraft`.
  - `Inventory`: company-owned inventory container with a many-to-many relationship to `Part` through `InventoryPart`.
  - `InventoryPart`: through table with `inventory`, `part`, `quantity`, `stock_alert`, `stock_alert_percentage`, and `shop_location`.
  - `WorkOrder`: maintenance record with `aircraft`, `created_by`, `title`, `description`, `status`, `due_by`, `tach_time`, `hobbs_time`, `ATA_code`, `components_affected`, `components_image`, `signed_by`, `signature`, and `signature_date`.
  - `WorkOrderPart`: through table with `work_order`, `part`, and `quantity`.
  - `Discrepancy`: aircraft issue record with optional `work_order`, `aircraft`, `reporter`, `date_reported`, `description`, `ata_code`, `tach_time`, and `status`.
  - `Flight`: scheduled flight with `company`, `aircraft`, `flight_number`, `origin`, `destination`, `departure_time`, `arrival_time`, `route`, `flight_type`, `primary_pilot`, `secondary_pilot`, `dispatcher`, `pilot_requirement`, and `status`.
  - `Tool`: `company`, `name`, `description`, `serial_number`, `calibration_due_date`, `location` and helpers for calibration status.
  - `CalibrationRecord`: `tool`, `calibration_date`, `performed_by`, `next_due_date`, `notes`.
  - `AircraftPhoto`: `aircraft`, `image`, `caption`, `sort_order`.
  - `AircraftMaintenanceInterval`: `aircraft`, `name`, `interval_type`, `due_every_hours`, `due_every_days`, `last_done_tach`, `last_done_hobbs`, `last_done_date`, AD metadata, and an `is_active` flag.
  - `WorkOrderActivity`: history entries for work order changes (actor, event type, summary, metadata).
  - `DiscrepancyActivity`: history entries for discrepancy changes (actor, event type, summary, metadata).
- **Relationships**:
  - One `Company` has many `Profile`, `Aircraft`, `Inventory`, and `Flight` records.
  - Each `Profile` may have one `Pilot` row or one `Mechanic` row, depending on `company_role`.
  - One `Aircraft` belongs to one `Company` and can have many `Part`, `WorkOrder`, `Discrepancy`, and `Flight` records.
  - `Inventory` and `Part` are many-to-many through `InventoryPart`, which stores stock metadata.
  - `WorkOrder` and `Part` are many-to-many through `WorkOrderPart`, which stores required quantities.
  - `Discrepancy` can optionally point to a `WorkOrder` when a defect is being worked.
  - `Flight` points to two pilot users and optionally a dispatcher; model validation enforces company membership, pilot role, medical clearance, and certificate level.
- **Migration Strategy**: This project uses Django [migrations](..\backend\api\migrations) to manage the relational database schema. Check the official [Django migrations documentation](https://docs.djangoproject.com/en/6.0/topics/migrations/) for more information. Also see the project's [seed command documentation](seed_db.md) for information on seeding the database with dummy testing data.

Note: the backend runs with `TIME_ZONE = 'UTC'` and `USE_TZ = True` — timestamps are stored/timezone-aware in UTC and some endpoints make timezone-aware conversions for datetimes.

---

## 6. External Interfaces
- **User Interface**: React single-page application built with Material UI, React Router, and a global app context for authentication and shared state.
- **External APIs**: Django REST API under `/api/`, including JWT auth endpoints, company-scoped resource endpoints, and Django admin under `/admin/`. See [API contract](APIContract.md).
- **Network Protocols/Communication**:
  - REST over HTTP/HTTPS with JSON request and response bodies.
  - JWT bearer authentication for protected API requests.
  - File uploads for profile images, mechanic certificates, and work order images/signatures.

---

## 7. Security Considerations
- **Authentication**: JWT access and refresh tokens via `rest_framework_simplejwt`, with short-lived access tokens and refresh token rotation/blacklisting enabled.
- **Authorization**: Company membership checks plus role-based permissions using custom DRF permission classes and view-level guards for owner, manager, mechanic, and own-profile access.
- **Data Protection**: Passwords are handled by Django auth, API traffic is designed for HTTPS deployment, CORS is explicitly restricted, CSRF trusted origins are configured for local development, and media files are stored through Django file fields.
  - Implementation note: the `Profile.role_choices` in the codebase currently contains a duplicated `('dispatcher', 'Dispatcher')` entry (see `backend/api/models.py`) — consider deduplicating this choice in the model.

---

## 8. Performance and Scalability
- **Caching Strategy**: No dedicated application cache layer is configured; the app relies on browser caching for static assets and direct database-backed API responses.
- **Database Optimization**: Company-scoped filtering is used throughout the backend, and some list views use `select_related` plus ordered querysets to reduce unnecessary joins and keep result sets predictable.
- **Scaling Strategy**: The frontend, backend, and database are separated into distinct deployable services, so static hosting and the Django web tier can scale independently while PostgreSQL remains the system of record.

---

## 9. Deployment Architecture
- **Environments**: Local development, test, and production. Production is deployed as three Render services: PostgreSQL, a Django web service, and a React static site.
- **Website Hosting**: The frontend is hosted as a Render Static Site built from `frontend/`; it calls the Django backend API hosted as a separate Render Web Service.

---

## 10. Testing Strategy
- **Unit Testing**: Backend tests use `pytest` with `pytest-django`. Frontend tests use Jest through `react-scripts test` and React Testing Library.
- **Integration Testing**: Backend integration tests live under `backend/api/testing/` and use shared pytest fixtures for models and API clients; frontend integration-style tests cover pages, components, and API flows with mocked network calls.
- **End-to-End Testing**: Playwright-based E2E tests validate core user flows across the frontend and API; configuration and helpers live in the [e2e](e2e) folder with specs under `tests` (see [e2e/playwright.config.ts](e2e/playwright.config.ts) and [e2e/global-setup.ts](e2e/global-setup.ts)), global setup and scripts provision test accounts and seed data, artifacts (screenshots, traces, JSON results) are written to `test-results/` for debugging/CI, and the suite runs locally or headlessly in CI via the Playwright CLI or npm scripts.

---
