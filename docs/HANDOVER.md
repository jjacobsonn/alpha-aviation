# Alpha Aviation — Handover Guide

Use this page when onboarding a new team or transferring the project. All project documentation lives under [`docs/`](README.md).

## Live environment (Railway)

| Service | URL |
|---------|-----|
| Web app | https://alpha-aviation-web-production-3763.up.railway.app/ |
| API | https://alpha-aviation-api-production-03c8.up.railway.app/api/ |
| Django admin | https://alpha-aviation-api-production-03c8.up.railway.app/admin/ |
| Site Admin (SPA) | https://alpha-aviation-web-production-3763.up.railway.app/site-admin |

Demo credentials and tenant walkthrough: [../README.md](../README.md#demo-credentials).

## First-day checklist

1. Clone the repo and follow [setup/DEVELOPMENT.md](setup/DEVELOPMENT.md).
2. Run `npm run dev` from the repo root (backend `:8000`, frontend `:3000`).
3. Log in with demo accounts from the root README.
4. Skim [rbac/RBAC_MVP_MATRIX.md](rbac/RBAC_MVP_MATRIX.md) for role behavior.
5. Review [architecture/APIContract.md](architecture/APIContract.md) before changing endpoints.

## Documentation map

| If you need… | Start here |
|--------------|------------|
| Local setup & env vars | [setup/DEVELOPMENT.md](setup/DEVELOPMENT.md) |
| What not to commit (secrets, locks) | [setup/GIT_AND_SECRETS.md](setup/GIT_AND_SECRETS.md) |
| Deploy / Railway config | [deployment/RAILWAY.md](deployment/RAILWAY.md) |
| Roles & permissions | [rbac/RBAC_MVP_MATRIX.md](rbac/RBAC_MVP_MATRIX.md) |
| Data model | [architecture/models_documentation.md](architecture/models_documentation.md) |
| Phase 2 feature status | [features/PHASE2_ACCEPTANCE_CRITERIA.md](features/PHASE2_ACCEPTANCE_CRITERIA.md) |
| Production go-live bar | [operations/PRODUCTION_READINESS_ROADMAP.md](operations/PRODUCTION_READINESS_ROADMAP.md) |
| Full audit & QA inventory | [operations/CODEBASE_AUDIT_AND_QA_INVENTORY.md](operations/CODEBASE_AUDIT_AND_QA_INVENTORY.md) |
| Closeout QA / known limits | [operations/FINAL_QA_REPORT.md](operations/FINAL_QA_REPORT.md) |
| Running tests | [testing/README.md](testing/README.md) |
| Client module spec (PDF) | [reference/Alpha Aviation_Module Details (2).pdf](reference/Alpha%20Aviation_Module%20Details%20(2).pdf) |

## Repository layout

```
alpha-aviation/
├── backend/          Django REST API (Poetry)
├── frontend/         React SPA (Yarn / CRA)
├── e2e/              Playwright smoke tests
├── docs/             All project documentation (this folder)
├── package.json      Root scripts (npm run dev, test:e2e)
└── README.md         Project overview + demo credentials
```

## Demo data

Horizon and Cascade tenants are seeded via management commands documented in the root [README.md](../README.md#re-seed-demo-data). Local seeding details: [operations/seed_db.md](operations/seed_db.md).

## Known gaps (as of handover)

- Phase 2 acceptance: **23 / 24** criteria met — per-user dashboard widget drag-and-drop (MDV-004) deferred. See [features/PHASE2_ACCEPTANCE_CRITERIA.md](features/PHASE2_ACCEPTANCE_CRITERIA.md).
- Production readiness items and prioritized fixes: [operations/PRODUCTION_READINESS_ROADMAP.md](operations/PRODUCTION_READINESS_ROADMAP.md) and [operations/FINAL_QA_REPORT.md](operations/FINAL_QA_REPORT.md).

## Full index

See [README.md](README.md) for the complete documentation catalog.
