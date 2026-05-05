# Alpha Aviation Docs

This folder is now modular and organized by topic:

- `setup/` - local development setup and startup
- `deployment/` - production/deployment runbooks
- `rbac/` - role/permission strategy and validation docs
- `features/` - feature-specific implementation docs
- `architecture/` - API/data/design technical references
- `operations/` - maintenance and process docs
- `reference/` - external stakeholder materials/assets

## Start Here

- New teammate setup: [setup/DEVELOPMENT.md](setup/DEVELOPMENT.md)
- Deployment updates: [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)
- RBAC decisions: [rbac/RBAC_MVP_MATRIX.md](rbac/RBAC_MVP_MATRIX.md)

## Core Docs (Current)

| Doc | Purpose |
|---|---|
| [setup/DEVELOPMENT.md](setup/DEVELOPMENT.md) | Canonical local setup + run/test flow for backend/frontend. |
| [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) | Render deployment and environment configuration. |
| [architecture/APIContract.md](architecture/APIContract.md) | Backend API endpoint contract/reference. |
| [rbac/RBAC_MVP_MATRIX.md](rbac/RBAC_MVP_MATRIX.md) | Current RBAC source-of-truth for MVP behavior. |
| [rbac/SUPERUSER_AND_ADMINS.md](rbac/SUPERUSER_AND_ADMINS.md) | Platform admin/superuser policy and operations. |

## Reference Docs (Feature + Domain)

| Doc | Purpose |
|---|---|
| [features/WORK_ORDERS.md](features/WORK_ORDERS.md) | Work Orders page behavior and constraints. |
| [architecture/models_documentation.md](architecture/models_documentation.md) | Django model/entity reference. |
| [operations/seed_db.md](operations/seed_db.md) | Local seed command usage and caveats. |
| [features/fleet-module-implementation-spec.md](features/fleet-module-implementation-spec.md) | Fleet implementation details/spec notes. |
| [architecture/Software Design Document.md](architecture/Software Design Document.md) | Broader system design reference. |
| [architecture/my_db_diagram.png](architecture/my_db_diagram.png) | Database diagram image asset. |
| [reference/Alpha Aviation_Module Details (2).pdf](reference/Alpha Aviation_Module Details (2).pdf) | External module reference from client/stakeholders. |

## Legacy / Planning Docs (Historical Context)

These are retained for historical decision context and may not match current implementation:

- [rbac/RBAC_Plan.md](rbac/RBAC_Plan.md)
- [rbac/RBAC_Login_Testing.md](rbac/RBAC_Login_Testing.md)
- [rbac/ROLE_DASHBOARD_ROADMAP.md](rbac/ROLE_DASHBOARD_ROADMAP.md)
- [operations/MERGE_GUIDE.md](operations/MERGE_GUIDE.md)
- [operations/Project documentation guidelines.md](operations/Project documentation guidelines.md)

## Live Environments

- Website: [alpha-aviation-dev-1.onrender.com](https://alpha-aviation-dev-1.onrender.com/)
- Django admin: [alpha-aviation-dev.onrender.com/admin/](https://alpha-aviation-dev.onrender.com/admin/)
