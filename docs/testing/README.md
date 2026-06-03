# Testing Documentation

Test **code** stays next to the app (`backend/api/testing/`, `frontend/src/tests/`, `e2e/`). This folder holds reports, runbooks, and suite overviews.

## Quick commands

| Suite | Command |
|-------|---------|
| Backend (pytest) | `cd backend && python -m pytest api/testing -q` |
| Frontend (Jest) | `cd frontend && CI=true npm test -- --watchAll=false` |
| E2E (Playwright) | `npm run test:e2e` (repo root) |

## Docs

| Doc | Purpose |
|-----|---------|
| [QA_TESTING_REPORT_5-18-26.md](QA_TESTING_REPORT_5-18-26.md) | Combined frontend/backend/e2e status snapshot (May 2026) |
| [backend/README.md](backend/README.md) | Backend pytest suite overview and module map |
| [backend/BackendTests_5-28-26.md](backend/BackendTests_5-28-26.md) | Backend QA report (May 2026) |
| [frontend/FrontendTests_5-28-26.md](frontend/FrontendTests_5-28-26.md) | Frontend QA report (May 2026) |
| [frontend/FrontendTests_3-4-26.md](frontend/FrontendTests_3-4-26.md) | Earlier frontend test inventory (Mar 2026) |
| [e2e.md](e2e.md) | Playwright smoke test setup and coverage |
