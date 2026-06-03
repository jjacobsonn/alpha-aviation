<a name="top"></a>

# Alpha Aviation

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Django](https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.16-ff1709?logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Material UI](https://img.shields.io/badge/MUI-7-007FFF?logo=mui&logoColor=white)](https://mui.com/)
[![React Router](https://img.shields.io/badge/React%20Router-7-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?logo=axios&logoColor=white)](https://axios-http.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Poetry](https://img.shields.io/badge/Poetry-deps-60A5FA?logo=poetry&logoColor=white)](https://python-poetry.org/)
[![Yarn](https://img.shields.io/badge/Yarn-package-2C8EBB?logo=yarn&logoColor=white)](https://yarnpkg.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Gunicorn](https://img.shields.io/badge/Gunicorn-WSGI-499848?logo=gunicorn&logoColor=white)](https://gunicorn.org/)
[![Docker](https://img.shields.io/badge/Docker-deploy-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Railway](https://img.shields.io/badge/Railway-hosting-0B0D0E?logo=railway&logoColor=white)](https://railway.app/)
[![WhiteNoise](https://img.shields.io/badge/WhiteNoise-static-092E20)](https://whitenoise.readthedocs.io/)

Monorepo for fleet operations, maintenance, parts, dispatch, and platform administration.

## What is Alpha Aviation?

**Alpha Aviation** is a multi-tenant aviation operations platform for flight schools and charter operators. A **Django REST API** backend and **React** web app share one PostgreSQL database and JWT authentication.

Typical workflows:

- **Owners / managers** — fleet status, work orders, company overview  
- **Dispatchers** — flight scheduling and approval  
- **Pilots** — assigned flights and aircraft  
- **Mechanics** — discrepancies, maintenance, parts, service history, component tracking  
- **Platform superuser** — cross-tenant Site Admin (companies, users, aircraft, global data)

This repository contains `backend/` and `frontend/` in a single monorepo for local development and deployment.

## Live application

Production is hosted on **Railway**. Demo data (Horizon + Cascade tenants) is seeded on this environment.

| | URL |
|---|-----|
| **App (login)** | **[https://alpha-aviation-web-production.up.railway.app/](https://alpha-aviation-web-production.up.railway.app/)** |
| API | [https://alpha-aviation-production.up.railway.app/api/](https://alpha-aviation-production.up.railway.app/api/) |
| Django admin | [https://alpha-aviation-production.up.railway.app/admin/](https://alpha-aviation-production.up.railway.app/admin/) |
| Site Admin (SPA) | [https://alpha-aviation-web-production.up.railway.app/site-admin](https://alpha-aviation-web-production.up.railway.app/site-admin) |

---

## Demo credentials

**Default password for every account below:** `Demo2026!`

### Platform superuser (Site Admin + Django admin)

| Field | Value |
|-------|--------|
| **Username** | `demo` |
| **Password** | `Demo2026!` |
| **Access** | Superuser — all companies; not tied to one tenant |
| **SPA** | Log in at the app URL → **Site Admin** (`/site-admin`) |
| **Django** | Same credentials at `/admin/` |

**Site Admin tips**

- Companies table lists all tenants when the latest frontend is deployed.  
- To work inside **Cascade Air Services** as `demo`: set tenant context  
  `localStorage.setItem('adminCompanyId', '2'); location.reload();`  
  (use `1` for Horizon).  
- To see every company in the table:  
  `localStorage.removeItem('adminCompanyId'); location.reload();`

### Tenant 1 — Horizon Flight Services

Locations: **KBFI** (Seattle Boeing Field), **KPAE** (Everett Paine Field). Six aircraft, full demo fleet.

| Username | Role | Good for |
|----------|------|----------|
| `marcus.hale` | Owner | Management, fleet overview |
| `sarah.mitchell` | Dispatcher | Calendar, approvals |
| `jenny.walsh` | Dispatcher | Alternate dispatch |
| `james.rivera` | Pilot | Pilot portal |
| `alex.nguyen` | Pilot | SIC / charter |
| `emily.chen` | Pilot | Training |
| `david.okonkwo` | Pilot | King Air / airline cert |
| `mike.torres` | Mechanic | Work orders, discrepancies |
| `lisa.park` | Mechanic | Inspections |
| `carlos.mendez` | Mechanic | Turbine / prop |

**Suggested flow:** `marcus.hale` → `sarah.mitchell` → `james.rivera` → `mike.torres` → `demo` (Site Admin).

### Tenant 2 — Cascade Air Services

Locations: **KPDX** (Portland). Smaller second company for platform-admin testing (2 aircraft, flights, parts, work orders, service history, component history).

| Username | Role |
|----------|------|
| `ellen.cascade` | Owner |
| `dana.cascade` | Dispatcher |
| `nina.cascade` | Pilot |
| `owen.cascade` | Pilot |
| `rex.cascade` | Mechanic |
| `tina.cascade` | Mechanic |

Aircraft: **N55CAS** (172S), **N88CAS** (SR22T).

---

## Table of contents

- [Repository structure](#repository-structure)
- [How to run locally](#how-to-run-locally)
- [Re-seed demo data](#re-seed-demo-data)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

## Repository structure

| Folder | Description |
|--------|-------------|
| **`backend/`** | Django 5 + DRF API, JWT, PostgreSQL, Poetry, Gunicorn. `api/`, `config/`, `manage.py`. |
| **`frontend/`** | React 19 + MUI + React Router + Axios (CRA). `src/`, `public/`. |

## How to run locally

One-time setup: [docs/setup/DEVELOPMENT.md](docs/setup/DEVELOPMENT.md).

```bash
npm install          # repo root — installs concurrently
npm run dev          # backend :8000 + frontend :3000
```

| App | Command | URL |
|-----|---------|-----|
| Backend | `cd backend && poetry install && poetry run python manage.py runserver` | http://localhost:8000 |
| Frontend | `cd frontend && yarn install && yarn start` | http://localhost:3000 |

Frontend API base: `REACT_APP_API_URL=http://localhost:8000/api` in `frontend/.env`.

## Re-seed demo data

From `backend/` with the Railway Postgres **public** `DATABASE_URL` (Railway dashboard → Postgres service → **Connect**):

```bash
export DATABASE_URL='postgresql://...'

poetry run python manage.py bootstrap_horizon_demo
poetry run python manage.py bootstrap_cascade_demo
poetry run python manage.py bootstrap_parts_and_tools --company-id 1
poetry run python manage.py bootstrap_labor_entries
```

Commands are idempotent (safe to run again before a demo).

## Deployment

Production runs on **Railway**: PostgreSQL, API (`Dockerfile.railway-api`), and web (`frontend/Dockerfile`). See [docs/deployment/RAILWAY.md](docs/deployment/RAILWAY.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/HANDOVER.md](docs/HANDOVER.md) | Onboarding guide and doc map |
| [docs/setup/DEVELOPMENT.md](docs/setup/DEVELOPMENT.md) | Local DB, env vars, testing API + UI |
| [docs/README.md](docs/README.md) | Full documentation index |

## License

See backend and frontend folders and their source repositories for license terms.

[Back to top](#top)
