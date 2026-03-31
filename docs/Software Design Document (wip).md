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
- **Architecture Summary**: Modular monolith (Django REST API) + separate React SPA client + PostgreSQL database, deployed as 3 cooperating services.
- **System Context Diagram**:
  - *Use Mermaid diagram here.*
  - Example placeholder:
    ```mermaid
    # Add your system context diagram here
    ```

---

## 3. Architectural Design
- **System Architecture Diagram**: {may need to reformat mermaid diagram}
  ```mermaid
  flowchart LR
    U[Users: Pilots, Mechanics, Managers, Dispatchers]
    FE[React SPA Frontend: UI, Routing, API Client]
    API[Django REST API: Auth and Domain Endpoints]
    AUTH[Auth and Access Control: JWT and RBAC]
    DOMAIN[Domain Model Layer: Company, Profile, Aircraft, Flight, Inventory, WorkOrder, Discrepancy]
    DB[(PostgreSQL Database)]
    INFRA[Render Infrastructure: Static Site, Web Service, PostgreSQL]

    U --> FE
    FE -->|HTTPS JSON REST| API
    API --> AUTH
    API --> DOMAIN
    AUTH --> DOMAIN
    DOMAIN --> DB

    FE -. deployed as .-> INFRA
    API -. deployed as .-> INFRA
    DB -. deployed as .-> INFRA
  ```
- **Component Breakdown**
  - **Frontend client layer**: a React single-page app responsible for UI, routing, and user interactions.
  - **API/application layer**: a Django REST backend exposing auth endpoints and domain endpoints through one API surface.
  - **Domain model layer**: core aviation/business entities and rules (company, profiles/users, aircraft, flights, inventory, work orders, discrepancies).
  - **Auth and access control layer**: JWT-based login/refresh flow plus backend permission controls, with frontend token handling and refresh logic.
  - **Data persistence layer**: PostgreSQL as the primary datastore, schema managed through Django migrations.
  - **Infrastructure/deployment layer**: three deployed services working together (React static site, Django web service, PostgreSQL database). 
- **Technology Stack** [Languages, frameworks, databases.]
    - Backend: Django with Python, unit testing with Pytest
    - Frontend: React.js, unit testing with Jest 
- **Data Flow and Control Flow**:
  - *Use Mermaid sequence or flow diagrams here.*

---

## 4. Detailed Design

### Frontend client layer
- **Responsibilities**: Visual design, UI/UX, page routing.
- **Interfaces/APIs**:
  - Inputs: User actions (clicks, form submissions, navigation), JWT tokens from local storage, JSON responses from backend endpoints.
  - Outputs: Rendered pages/components, API requests to backend, token updates in local storage, user-facing validation/error messages.
  - Error Handling: Centralized API error parsing; unauthorized responses trigger token refresh, then logout/redirect to login if refresh fails; network failures show user-friendly messages.
- **Data Structures**: Context state object with authentication flags, user profile fields, page title, site alerts, and monthly stats; request/response payload objects for auth and domain data.
- **Algorithms/Logic**: Client-side route transitions (SPA), request interceptor to attach bearer token, response interceptor queue for concurrent token refresh retries, reducer-based state transitions.
- **State Management**: React Context + useReducer for global app state; local component state for page-level forms and filters; persistent auth state via local storage.

### API/application layer
- **Responsibilities**: Provides Django REST API endpoints for authentication, domain resources, and company-scoped operations.
- **Interfaces/APIs**: (see [API contract document](APIContract.md))
  - Inputs: HTTP requests (JSON body, query params, auth headers), validated serializer data, authenticated user context.
  - Outputs: JSON responses with resource data, domain summaries, and standardized HTTP status codes (200/201/400/401/403/404).
  - Error Handling: Explicit request validation (missing/invalid params), serializer validation errors, permission failures, invalid credentials/tokens, business-rule checks (for example invalid role or date ranges).
- **Data Structures**: DRF serializers for Company, Profile, Aircraft, Part, Discrepancy, WorkOrder, Flight, Inventory; URL routing via function endpoints plus ViewSet endpoints.
  - See [models](..\backend\api\models.py) and [migrations](..\backend\api\migrations)
- **Algorithms/Logic**: Company scoping filters, role-gated endpoint access, date-range parsing and checks, queryset optimization with related-object loading, mixed endpoint style (function-based + class-based APIs).
- **State Management**: Stateless request/response processing on the server; persistent application state stored in PostgreSQL; authentication state represented by JWT access and refresh tokens.

### Domain model layer
- **Responsibilities**: Encapsulates core aviation business entities and rules for users, company operations, maintenance, scheduling, and inventory.
- **Interfaces/APIs**:
  - Inputs: Model field values, related entity references, datetime/date parameters for availability and calendar queries.
  - Outputs: ORM model instances, related query results, and computed summaries for company-scoped operations.
  - Error Handling: Model-level and serializer-level validation, plus database integrity constraints for invalid or conflicting data.
- **Data Structures**: Relational models including Company, Profile, Aircraft, Flight, Part, Inventory, WorkOrder, and Discrepancy, with foreign-key relationships.
- **Algorithms/Logic**: Aircraft availability overlap checks, date-window flight filtering, low-stock detection logic, and role-specific profile serialization behavior.
- **State Management**: Canonical domain state is persisted in PostgreSQL through Django ORM and migrations; no in-memory domain state is assumed between requests.

### Auth and access control layer
- **Responsibilities**: [What does it do?]
- **Interfaces/APIs**:
  - Inputs: [Describe input data.]
  - Outputs: [Describe output data.]
  - Error Handling: [Describe approach.]
- **Data Structures**: [Key models/schemas.]
- **Algorithms/Logic**: [Design patterns or important logic.]
- **State Management**: [How is state handled?]

### Data persistence layer
- **Responsibilities**: Persists and queries application data, enforces schema constraints, and manages schema evolution through migrations.
- **Interfaces/APIs**:
  - Inputs: Django ORM CRUD operations, migration definitions, and environment-based database connection settings.
  - Outputs: Relational records, querysets, transactional writes, and migration history.
  - Error Handling: Constraint violations, validation failures, missing relations, and migration conflict handling through Django migration workflow.
- **Data Structures**: PostgreSQL relational schema generated from Django models and migration files, including foreign keys and indexed fields.
- **Algorithms/Logic**: Company-scoped filtering, ordered result sets for operational views, and selective related-object loading for performance.
- **State Management**: Durable application state is centralized in PostgreSQL; schema version state is tracked in Django migration metadata.

### Infrastructure/deployment layer
- **Responsibilities**: Builds, hosts, and connects frontend, backend, and database services across development and production environments.
- **Interfaces/APIs**:
  - Inputs: Git commits, build/start commands, environment variables, and inbound HTTP traffic.
  - Outputs: Deployed static frontend, running Django API/admin service, connected PostgreSQL instance, and service logs.
  - Error Handling: Service restart/redeploy behavior, startup validation through migration/static-collection commands, and backend HTTP error responses.
- **Data Structures**: Service configuration for three deployable units (static site, web service, database), environment variable maps, and SPA rewrite rules.
- **Algorithms/Logic**: Separation of build-time and runtime steps, startup migration/static workflow, and frontend/backend origin coordination with CORS.
- **State Management**: Runtime services are mostly stateless; persistent application data state lives in PostgreSQL; deployment configuration state is managed by the hosting platform.

---

## 5. Database Design
- [ER Diagram / Schema Diagram](my_db_diagram.png):
  - *Use Mermaid ER diagram here.*
- **Tables/Collections**: [Define each with fields and constraints.]
- **Relationships**: [Describe relationships between entities.]
- **Migration Strategy**: [If applicable.]

---

## 6. External Interfaces
- **User Interface**: [Mockups, UX notes.]
- **External APIs**: [Integrations and dependencies.]
- **Hardware Interfaces**: [If any.]
- **Network Protocols/Communication**:
  - [REST, GraphQL, gRPC, WebSockets, etc.]

---

## 7. Security Considerations
- **Authentication**: [Method used.]
- **Authorization**: [Role/permission models.]
- **Data Protection**: [Encryption, storage.]
- **Compliance**: [GDPR, HIPAA, etc.]
- **Threat Model**:
  - *Use Mermaid diagram here if helpful.*

---

## 8. Performance and Scalability
- **Expected Load**: [Requests per second, data volume.]
- **Caching Strategy**: [Describe caches used.]
- **Database Optimization**: [Indexes, partitioning.]
- **Scaling Strategy**: [Vertical/horizontal.]

---

## 9. Deployment Architecture
- **Environments**: [Dev, staging, production.]
- **CI/CD Pipeline**: [Tools and stages.]
- **Infrastructure Diagram**:
  - *Use Mermaid diagram here.*
- **Cloud/Hosting**: [AWS, GCP, Azure, etc.]
- **Containerization/Orchestration**: [Docker, Kubernetes.]

---

## 10. Testing Strategy
- **Unit Testing**: [Tools, coverage goals.]
- **Integration Testing**: [Approach and tools.]
- **End-to-End Testing**: [Scope and tools.]
- **Quality Metrics**: [Code coverage, linting, etc.]

---

## 11. Appendices
- **Diagrams**: [All referenced diagrams.]
- **Glossary**: [Terms and definitions.]
- **Change History**:
  - [Version, Date, Author, Changes]

---

> **Tip**: Use Mermaid diagrams throughout to make architecture, data flow, and interfaces clear and easy to maintain.