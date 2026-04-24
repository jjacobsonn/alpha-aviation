<a name="top"></a>

# Alpha Aviation

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.x-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/Django%20REST%20Framework-3.16-ff1709?logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MUI](https://img.shields.io/badge/Material%20UI-7.x-007FFF?logo=mui&logoColor=white)](https://mui.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-black?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License](https://img.shields.io/badge/License-See%20repos-lightgrey)](#-license)

Monorepo for the Alpha Aviation application: backend API and web frontend.

## Table of Contents

- [Live links](#live-links)
- [About](#about)
- [Repository structure](#repository-structure)
- [How to run](#how-to-run)
- [Deployment](#deployment)
- [License](#license)

**Documentation** ([docs/](docs/)):

- **Local setup** — Database, env, run backend + frontend: [DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Deploy on Render** — 3 services (DB, backend, frontend): [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Live links

> NOTE: These URLs point at the current live Render deployment. If you change or replace them, make sure you’re not breaking links that people or docs rely on.

| Link | URL |
|------|-----|
| **Website (app)** | [https://alpha-aviation-dev-1.onrender.com/](https://alpha-aviation-dev-1.onrender.com/) |
| **Django admin** | [https://alpha-aviation-dev.onrender.com/admin/](https://alpha-aviation-dev.onrender.com/admin/) |

## About

**Alpha Aviation** is an aviation management application consisting of a Django REST API backend and a React web frontend. This repository contains both in a single monorepo for easier development and deployment.

## Repository structure

| Folder | Description |
|--------|-------------|
| **`/backend`** | Django REST API. Python 3.12+, Django 5.x, Django REST Framework, PostgreSQL, JWT auth, CORS. Uses Poetry for dependencies. Contains `api/`, `config/`, `src/`, `manage.py`, and project configuration. See `backend/` README or `Django backend requirements.pdf` for setup details. |
| **`/frontend`** | React web app. React 19, Create React App, Material UI (MUI), React Router, Axios. Uses Yarn. Contains `src/`, `public/`, and standard CRA scripts (`start`, `build`, `test`). See `frontend/README.md` for full frontend docs. |

## How to run

**One command from repo root** (after [one-time setup](docs/DEVELOPMENT.md#one-time-setup-summary)):

```bash
npm install   # once: installs concurrently at root
npm run dev   # starts backend (port 8000) + frontend (port 3000)
```

**Or run each app separately:**

| App | Command | URL |
|-----|---------|-----|
| Backend | `cd backend && poetry install && poetry run python manage.py runserver` | http://localhost:8000 |
| Frontend | `cd frontend && yarn install && yarn start` | http://localhost:3000 |

The frontend talks to the backend at `http://localhost:8000/api` (see `REACT_APP_API_URL` in `frontend/.env`). For env vars, database setup, and **how to test backend vs frontend and that they’re connected**, see **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#how-to-test-that-backend-and-frontend-are-working-together)**.

## Deployment

The app runs on [Render](https://render.com) as **three services**:

1. **PostgreSQL** — database (e.g. `alpha-aviation-db`)
2. **Web Service (Python)** — Django API + admin (e.g. `alpha-aviation-dev`)
3. **Static Site** — React frontend (e.g. `alpha-aviation-dev-1`)

Full step-by-step setup (env vars, CORS, SPA rewrite, superuser) is in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Use it when connecting a new GitHub repo or creating a new Render project.

## License

See the individual backend and frontend folders and their source repositories for license and usage terms.

[Back to top](#top)
