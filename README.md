<a name="top"></a>

# Alpha Aviation

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.x-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![license](https://img.shields.io/badge/license-See%20repos-brightgreen)](#-license)

Monorepo for the Alpha Aviation application: backend API and web frontend.

## Table of Contents

- [About](#-about)
- [Repository structure](#-repository-structure)
- [How to run](#-how-to-run)
- [License](#-license)

**Documentation:** [docs/](docs/) — setup, testing, and merge guide.

For **full-stack setup** (database, env, running backend + frontend together, testing), see **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

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

## License

See the individual backend and frontend folders and their source repositories for license and usage terms.

[Back to top](#top)
