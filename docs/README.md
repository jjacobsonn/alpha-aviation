# Alpha Aviation Docs

All project documentation lives in this folder. For onboarding and transfer, start with **[HANDOVER.md](HANDOVER.md)**.

## Structure

| Folder | Contents |
|--------|----------|
| [setup/](setup/) | Local development setup and startup |
| [deployment/](deployment/) | Production deployment runbooks |
| [rbac/](rbac/) | Role/permission strategy and validation |
| [features/](features/) | Feature specs, Phase 2 checklist, domain flows |
| [architecture/](architecture/) | API contract, models, system design |
| [operations/](operations/) | QA, production readiness, seeding, process |
| [testing/](testing/) | Test suite docs and QA reports |
| [reference/](reference/) | Stakeholder PDFs, spreadsheets, external assets |

## Start here

- **New teammate / handover:** [HANDOVER.md](HANDOVER.md)
- **Local setup:** [setup/DEVELOPMENT.md](setup/DEVELOPMENT.md)
- **Deployment:** [deployment/RAILWAY.md](deployment/RAILWAY.md)
- **RBAC source of truth:** [rbac/RBAC_MVP_MATRIX.md](rbac/RBAC_MVP_MATRIX.md)
- **Production go-live bar:** [operations/PRODUCTION_READINESS_ROADMAP.md](operations/PRODUCTION_READINESS_ROADMAP.md)
- **Full audit & QA inventory:** [operations/CODEBASE_AUDIT_AND_QA_INVENTORY.md](operations/CODEBASE_AUDIT_AND_QA_INVENTORY.md)
- **Closeout QA report:** [operations/FINAL_QA_REPORT.md](operations/FINAL_QA_REPORT.md)

## Core docs

| Doc | Purpose |
|-----|---------|
| [setup/DEVELOPMENT.md](setup/DEVELOPMENT.md) | Canonical local setup + run/test flow |
| [deployment/RAILWAY.md](deployment/RAILWAY.md) | **Production** Railway deployment |
| [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) | Historical Render runbook |
| [architecture/APIContract.md](architecture/APIContract.md) | Backend API endpoint contract |
| [rbac/RBAC_MVP_MATRIX.md](rbac/RBAC_MVP_MATRIX.md) | Current RBAC behavior for MVP |
| [rbac/SUPERUSER_AND_ADMINS.md](rbac/SUPERUSER_AND_ADMINS.md) | Platform admin / superuser policy |
| [operations/PRODUCTION_READINESS_ROADMAP.md](operations/PRODUCTION_READINESS_ROADMAP.md) | Release gate before multi-tenant production |
| [operations/CODEBASE_AUDIT_AND_QA_INVENTORY.md](operations/CODEBASE_AUDIT_AND_QA_INVENTORY.md) | Inventory, architecture, endpoints, risks (May 2026) |
| [operations/FINAL_QA_REPORT.md](operations/FINAL_QA_REPORT.md) | JWT fix status, media/demo verdict, deployment checklist |

## Features & domain

| Doc | Purpose |
|-----|---------|
| [features/PHASE2_ACCEPTANCE_CRITERIA.md](features/PHASE2_ACCEPTANCE_CRITERIA.md) | Phase 2 feature checklist (23/24 complete) |
| [features/PHASE2_MVP.md](features/PHASE2_MVP.md) | Phase 2 implementation notes and build order |
| [features/WORK_ORDERS.md](features/WORK_ORDERS.md) | Work Orders page behavior |
| [features/work_order_flow.md](features/work_order_flow.md) | Discrepancy → work order → closure flow |
| [features/TOOL_CALIBRATION_TRACKING.md](features/TOOL_CALIBRATION_TRACKING.md) | Tool calibration feature spec |
| [features/fleet-module-implementation-spec.md](features/fleet-module-implementation-spec.md) | Fleet module implementation notes |
| [architecture/models_documentation.md](architecture/models_documentation.md) | Django model reference |
| [architecture/Software Design Document.md](architecture/Software%20Design%20Document.md) | Broader system design reference |
| [architecture/my_db_diagram.png](architecture/my_db_diagram.png) | Database diagram |
| [operations/seed_db.md](operations/seed_db.md) | Local `seed` command usage |

## Testing

| Doc | Purpose |
|-----|---------|
| [testing/README.md](testing/README.md) | Test docs index + quick commands |
| [testing/QA_TESTING_REPORT_5-18-26.md](testing/QA_TESTING_REPORT_5-18-26.md) | Combined test status snapshot |
| [testing/backend/README.md](testing/backend/README.md) | Pytest suite overview |
| [testing/e2e.md](testing/e2e.md) | Playwright smoke tests |

Test **code** remains in `backend/api/testing/`, `frontend/src/tests/`, and `e2e/`.

## Reference & legacy

| Doc | Purpose |
|-----|---------|
| [reference/Alpha Aviation_Module Details (2).pdf](reference/Alpha%20Aviation_Module%20Details%20(2).pdf) | Client module requirements (PDF) |
| [reference/alpha_aviation_permissions.xlsx](reference/alpha_aviation_permissions.xlsx) | Permissions spreadsheet |

Historical / planning context (may not match current code):

- [rbac/RBAC_Plan.md](rbac/RBAC_Plan.md)
- [rbac/RBAC_Login_Testing.md](rbac/RBAC_Login_Testing.md)
- [rbac/ROLE_DASHBOARD_ROADMAP.md](rbac/ROLE_DASHBOARD_ROADMAP.md)
- [operations/MERGE_GUIDE.md](operations/MERGE_GUIDE.md)
- [operations/Project documentation guidelines.md](operations/Project%20documentation%20guidelines.md)

## Live environment

Production runs on **Railway** (see root [README.md](../README.md) for demo credentials):

- Web: [alpha-aviation-web-production-3763.up.railway.app](https://alpha-aviation-web-production-3763.up.railway.app/)
- API: [alpha-aviation-api-production-03c8.up.railway.app/api/](https://alpha-aviation-api-production-03c8.up.railway.app/api/)
- Admin: [alpha-aviation-api-production-03c8.up.railway.app/admin/](https://alpha-aviation-api-production-03c8.up.railway.app/admin/)
