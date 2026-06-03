<a id="readme-top"></a>

<!-- TECH STACK -->
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

<br />

<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://alpha-aviation-web-production-3763.up.railway.app/">
    <img src="assets/images/logo.png" alt="Alpha Aviation" width="80" height="80">
  </a>

  <h3 align="center">Alpha Aviation</h3>

  <p align="center">
    Multi-tenant aviation operations — fleet, dispatch, maintenance, and platform admin in one system.
    <br />
    <br />
    <a href="https://alpha-aviation-web-production-3763.up.railway.app/"><strong>View live app »</strong></a>
    <br />
    <br />
    <a href="https://alpha-aviation-web-production-3763.up.railway.app/">View Demo</a>
    &middot;
    <a href="https://github.com/jjacobsonn/alpha-aviation/issues">Report Bug</a>
    &middot;
    <a href="https://github.com/jjacobsonn/alpha-aviation/issues">Request Feature</a>
  </p>
</div>

<br />

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#live-application">Live Application</a></li>
    <li><a href="#demo-credentials">Demo Credentials</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#repository-structure">Repository Structure</a></li>
    <li><a href="#deployment">Deployment</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<br />

<!-- ABOUT THE PROJECT -->
## About The Project

<div align="center">
  <a href="https://alpha-aviation-web-production-3763.up.railway.app/management">
    <img src="assets/images/ss-1.png" alt="Alpha Aviation management dashboard" width="900">
  </a>
</div>

<br />

**Alpha Aviation** is operations software for flight schools and charter operators — one place to run the fleet, schedule flights, track maintenance, and keep every role on the same page.

Most small and mid-size operators still juggle spreadsheets, email threads, and disconnected tools. Work orders live in one place, dispatch in another, and leadership only gets a clear picture after someone builds a report. Alpha Aviation replaces that friction with a single **multi-tenant** web app: each company gets its own aircraft, users, flights, and maintenance history, while a platform admin can oversee every tenant from **Site Admin**.

**What you get**

* **Management dashboard** — fleet readiness, open work-order load, recurring discrepancy patterns, and roster visibility for owners and managers
* **Dispatch & calendar** — company-wide flight list, approvals, and scheduling for dispatchers (owners use the same views; pilots see assigned flights on their portal)
* **Maintenance hub** — discrepancies, work orders, parts, service history, and component tracking for mechanics and supervisors
* **Fleet registry** — tail numbers, status, locations, and aircraft detail with open maintenance context
* **Analytics** — maintenance trends, labor, and operational metrics for leadership
* **Role-based access** — JWT auth with per-company roles (owner, manager, dispatcher, mechanic, pilot) so people only see what their job requires

Under the hood it is a **Django REST API** and **React** SPA on **PostgreSQL**, deployed as a modern full-stack product. Explore the live app above, then use the [documentation index](docs/README.md) for architecture, RBAC, and deployment if you are running it locally.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

Alpha Aviation was built as a **production-style monorepo**: multi-tenant REST API, JWT-secured SPA, role-based modules (management, dispatch, maintenance, fleet, analytics, site admin), and Railway-hosted Docker deploys — not a starter kit.

| Layer | What we shipped |
|-------|------------------|
| **Frontend** | React 19 SPA, Material UI 7, React Router 7, MUI X Charts, global search, responsive tables |
| **API** | Django 5 + Django REST Framework, JWT auth, per-company RBAC, analytics and management dashboards |
| **Data** | PostgreSQL 18, Poetry-managed Python deps, seeded demo tenants (Horizon & Cascade) |
| **Ops** | Docker images, Gunicorn, Railway (API + web + Postgres), environment-based API URL for CRA builds |

* [![React][React.js]][React-url]
* [![Django][Django.com]][Django-url]
* [![PostgreSQL][PostgreSQL.com]][PostgreSQL-url]
* [![Python][Python.org]][Python-url]
* [![Material UI][MUI.com]][MUI-url]
* [![Docker][Docker.com]][Docker-url]
* [![Railway][Railway.app]][Railway-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Live Application

Hosted on **Railway** (personal portfolio environment).

| | URL |
|---|-----|
| **App (login)** | **[https://alpha-aviation-web-production-3763.up.railway.app/](https://alpha-aviation-web-production-3763.up.railway.app/)** |
| API | [https://alpha-aviation-api-production-03c8.up.railway.app/api/](https://alpha-aviation-api-production-03c8.up.railway.app/api/) |
| Django admin | [https://alpha-aviation-api-production-03c8.up.railway.app/admin/](https://alpha-aviation-api-production-03c8.up.railway.app/admin/) |
| Site Admin (SPA) | [https://alpha-aviation-web-production-3763.up.railway.app/site-admin](https://alpha-aviation-web-production-3763.up.railway.app/site-admin) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Demo Credentials

**Default password for every account below:** `Demo2026!`

### Platform superuser (Site Admin + Django admin)

| Field | Value |
|-------|--------|
| **Username** | `demo` |
| **Password** | `Demo2026!` |
| **Access** | Superuser — all companies; not tied to one tenant |
| **SPA** | Log in at the app URL → **Site Admin** (`/site-admin`) |
| **Django** | Same credentials at `/admin/` |

### Demo 1 — Horizon Flight Services

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

**Suggested walkthrough:** `marcus.hale` → `sarah.mitchell` → `mike.torres` → `demo` (Site Admin).

### Demo 2 — Cascade Air Services

Locations: **KPDX** (Portland). Second tenant for multi-company / platform-admin scenarios.

| Username | Role |
|----------|------|
| `ellen.cascade` | Owner |
| `dana.cascade` | Dispatcher |
| `nina.cascade` | Pilot |
| `owen.cascade` | Pilot |
| `rex.cascade` | Mechanic |
| `tina.cascade` | Mechanic |

Aircraft: **N55CAS** (172S), **N88CAS** (SR22T).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<!-- GETTING STARTED -->
## Getting Started

Local setup: [docs/setup/DEVELOPMENT.md](docs/setup/DEVELOPMENT.md).

### Prerequisites

* **Node.js** 20+
* **Python** 3.12+ with [Poetry](https://python-poetry.org/)
* **PostgreSQL** (local)
* **Yarn** (frontend)

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/jjacobsonn/alpha-aviation.git
   cd alpha-aviation
   ```
2. Install root tooling and start both apps
   ```sh
   npm install
   npm run dev
   ```
3. Backend only (from `backend/`)
   ```sh
   poetry install
   poetry run python manage.py migrate
   poetry run python manage.py runserver
   ```
4. Frontend only (from `frontend/`)
   ```sh
   yarn install
   yarn start
   ```

| App | URL |
|-----|-----|
| Backend | http://localhost:8000 |
| Frontend | http://localhost:3000 |

Set `REACT_APP_API_URL=http://localhost:8000/api` in `frontend/.env`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Repository Structure

| Folder | Description |
|--------|-------------|
| **`backend/`** | Django API, models, migrations, pytest suite |
| **`frontend/`** | React SPA, components, pages, Jest tests |
| **`docs/`** | Architecture, RBAC, deployment, handover |
| **`assets/images/`** | README logo and product screenshots |
| **`e2e/`** | Playwright smoke tests |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Deployment

Production uses **Railway**: PostgreSQL, API (`Dockerfile.railway-api` / `backend/`), and web (`frontend/Dockerfile`). See [docs/deployment/RAILWAY.md](docs/deployment/RAILWAY.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contributing

Thank you to the lovely team who helped develop this project and bring it together — your work on fleet operations, maintenance workflows, dispatch, and platform admin made Alpha Aviation what it is.

<a href="https://github.com/jjacobsonn/alpha-aviation/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=jjacobsonn/alpha-aviation" alt="Contributors" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

This portfolio repository is **proprietary**. Unauthorized copying, redistribution, or commercial use of the codebase, UI, or demo content is **not permitted** and may result in takedown and legal action.

**Read the full terms:** [LICENSE.md](LICENSE.md)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/HANDOVER.md](docs/HANDOVER.md) | Onboarding and environment map |
| [docs/setup/DEVELOPMENT.md](docs/setup/DEVELOPMENT.md) | Local database, env vars, testing |
| [docs/README.md](docs/README.md) | Full documentation index |
| [docs/images/screenshots/README.md](docs/images/screenshots/README.md) | How to capture README screenshots |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Acknowledgments

**Product owner:** Jean Michel N'da (UVU) — product direction and stakeholder partnership.

**Development:** Alpha Aviation **e2i** team — design, backend, frontend, and delivery of the operational platform.

**Portfolio:** [Jackson Jacobson](https://github.com/jjacobsonn) — documentation, deployment, and public portfolio presentation of this repository.

**Technologies:** [Django](https://www.djangoproject.com/) · [React](https://react.dev/) · [Material UI](https://mui.com/) · [PostgreSQL](https://www.postgresql.org/) · [Railway](https://railway.app/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<p align="center">Alpha Aviation — portfolio project by <a href="https://github.com/jjacobsonn">jjacobsonn</a></p>

<!-- MARKDOWN LINKS & IMAGES -->
[product-screenshot]: assets/images/ss-1.png
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[Django.com]: https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white
[Django-url]: https://www.djangoproject.com/
[PostgreSQL.com]: https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
[Python.org]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[MUI.com]: https://img.shields.io/badge/MUI-007FFF?style=for-the-badge&logo=mui&logoColor=white
[MUI-url]: https://mui.com/
[Docker.com]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Railway.app]: https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white
[Railway-url]: https://railway.app/
