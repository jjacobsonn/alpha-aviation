# Deploy Alpha Aviation on Render

> NOTE: This document reflects the current live Render deployment. Be careful changing commands, env var names, or URLs without coordinating with whoever owns the deployment.

This guide covers deploying the monorepo to [Render](https://render.com) so the app is live and **auto-deploys on push to `main`**. Use it when setting up a new Render project or a new GitHub repo (e.g. a dev fork).

---

## How the three services work

Render hosts the app as **three separate services** that work together:

| Service type   | Example name           | Role |
|----------------|------------------------|------|
| **PostgreSQL** | `alpha-aviation-db`    | Database. Stores users, data. Backend connects via **Internal Database URL**. |
| **Web Service** (Python 3) | `alpha-aviation-dev` | Django backend: API (`/api/`), Django admin (`/admin/`), static files (WhiteNoise). Connects to the DB; frontend calls this. |
| **Static Site** | `alpha-aviation-dev-1` | React frontend. Built from `frontend/`; users open this URL. It calls the backend API. |

**URLs (replace with your service names):**

- **Website (app):** `https://<static-site-name>.onrender.com/` (e.g. `https://alpha-aviation-dev-1.onrender.com/`)
- **Django admin:** `https://<web-service-name>.onrender.com/admin/` (e.g. `https://alpha-aviation-dev.onrender.com/admin/`)
- **API base:** `https://<web-service-name>.onrender.com/api`

The backend and database should be in the **same region** (e.g. Oregon) so they can use the internal network. The static site can be global.

---

## 1. Create a Render account and connect GitHub

1. Go to [render.com](https://render.com) and sign up (or use GitHub login).
2. Create a **Project** (e.g. "Alpha Aviation") to group the three services.
3. When you create each service below, connect the **GitHub repo** that contains this monorepo (e.g. `jjacobsonn/alpha-aviation-dev` or `Alpha-Aviation-e2i/alpha-aviation`). Render will list repos your account can access.

---

## 2. Create the PostgreSQL database

1. In your project: **New + → PostgreSQL**.
2. **Name:** e.g. `alpha-aviation-db`.
3. **Region:** e.g. Oregon (US West). Use the same region for the backend later.
4. **Plan:** Free for testing.
5. **Create Database**.
6. After it’s created, open the database → **Info** or **Connect**.
7. Copy the **Internal Database URL** (full `postgresql://...` string). You’ll use it for the backend.
8. Optionally copy the **External Database URL** if you need to run `createsuperuser` from your local machine (see step 7).

---

## 3. Deploy the backend (Django Web Service)

1. **New + → Web Service**.
2. Connect the GitHub repo and select this monorepo; choose branch **main**.
3. Configure:
   - **Name:** e.g. `alpha-aviation-dev`.
   - **Region:** Same as the database (e.g. Oregon).
   - **Root Directory:** `backend`.
   - **Runtime:** Python 3.
   - **Build Command:** (install only — do not put migrate/gunicorn here)
     ```bash
     pip install poetry && poetry config virtualenvs.create false && poetry install
     ```
   - **Start Command:** (run at service start)
     ```bash
     python manage.py collectstatic --noinput && python manage.py migrate && gunicorn config.wsgi:application
     ```
4. **Environment variables** (backend service → **Environment**). Set exactly these keys:

   | Key | Required | Example value | Notes |
   |-----|----------|---------------|--------|
   | `DATABASE_URL` | **Yes** | `postgresql://…` from Postgres → **Internal Database URL** | Do not use `DB_*` on Render when this is set. |
   | `SECRET_KEY` | **Yes** | From `python3 -c "import secrets; print(secrets.token_urlsafe(32))"` | Never use the dev default in production. |
   | `DEBUG` | **Yes** | `False` | Must be `False` on Render. |
   | `ALLOWED_HOSTS` | **Yes** | `alpha-aviation-dev.onrender.com` | Hostname only — no `https://`, no path. |
   | `CORS_ALLOWED_ORIGINS` | **Yes** (after frontend exists) | `https://alpha-aviation-dev-1.onrender.com` | Full origin — `https://`, no trailing slash. Add in [step 5](#5-finish-backend-configuration) if the static site is not live yet. |

   **Do not set on Render (not read by current code):** `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` when `DATABASE_URL` is set.

   **Optional (paid disk only, not implemented in app yet):** `MEDIA_ROOT` — see [Media uploads](#media-uploads-and-persistent-storage-closeout).

   Template for local copy: `backend/.env.example`.

5. **Create Web Service**. Note the backend URL (e.g. `https://alpha-aviation-dev.onrender.com`). The root path `/` returns 404; use `/admin/` and `/api/` for this service.

---

## 4. Deploy the frontend (Static Site)

1. **New + → Static Site**.
2. Connect the same repo; branch **main**.
3. Configure:
   - **Name:** e.g. `alpha-aviation-dev-1`.
   - **Root Directory:** `frontend`.
   - **Build Command:** `npm install -g yarn && yarn install && yarn build`
   - **Publish Directory:** `build`.
4. **Environment variables** (static site → **Environment**):

   | Key | Required | Example value | Notes |
   |-----|----------|---------------|--------|
   | `REACT_APP_API_URL` | **Yes** | `https://alpha-aviation-dev.onrender.com/api` | Backend public URL + `/api`; no trailing slash. Baked in at **build** time — change requires redeploy. |

   Template: `frontend/.env.example`.
5. **Redirects/Rewrites** (required for React Router):
   - Add a **Rewrite** (not Redirect):
   - **Source path:** `/*`
   - **Destination path:** `/index.html`
   - **Action:** Rewrite
6. **Create Static Site**. Note the frontend URL (e.g. `https://alpha-aviation-dev-1.onrender.com`).

---

## 5. Finish backend configuration

1. Open the **backend** Web Service → **Environment**.
2. Add or set **`CORS_ALLOWED_ORIGINS`** to your **frontend** URL, e.g. `https://alpha-aviation-dev-1.onrender.com` (no trailing slash).
3. Save so the backend redeploys.

---

## 6. Create a superuser (login + admin)

The frontend login and Django admin use the **same** user table. You need at least one user in the **deployed** database.

**Option A — Render Shell (paid plans only)**  
On the backend Web Service, open **Shell** and run:

```bash
python manage.py createsuperuser
```

Then enter username, email, and password.

**Option B — From your machine using the Render database (free tier)**  
If Shell is not available (free tier), use the **External Database URL** from the Postgres service:

1. In a terminal, from the repo root:
   ```bash
   cd backend
   export DATABASE_URL='<paste External Database URL from Render Postgres>'
   poetry run python manage.py createsuperuser
   ```
2. Enter username (e.g. `admin`), email, and password.
3. Run `unset DATABASE_URL` when done so local dev uses your local DB again.

Use that **username** and **password** to log in at:

- **Frontend:** `https://<frontend-name>.onrender.com/login`
- **Django admin:** `https://<backend-name>.onrender.com/admin/`

---

## 7. Checklist and redoing deployment

When setting up a **new** Render project or a **new** GitHub repo (e.g. another dev fork), go through in order:

1. Create project → Create PostgreSQL → copy Internal (and optionally External) Database URL.
2. Create Web Service (backend): Root `backend`, Build Command = poetry install only, Start Command = collectstatic + migrate + gunicorn, env: `DATABASE_URL`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, then add `CORS_ALLOWED_ORIGINS` after frontend exists.
3. Create Static Site (frontend): Root `frontend`, Publish `build`, env: `REACT_APP_API_URL` = backend URL + `/api`, Rewrite `/*` → `/index.html`.
4. Add `CORS_ALLOWED_ORIGINS` on the backend = frontend URL.
5. Create a superuser (Shell or local with External Database URL).

**Live links (this deployment):**

- **Website:** [https://alpha-aviation-dev-1.onrender.com/](https://alpha-aviation-dev-1.onrender.com/)
- **Django admin:** [https://alpha-aviation-dev.onrender.com/admin/](https://alpha-aviation-dev.onrender.com/admin/)

---

## Media uploads and persistent storage (closeout)

The React app **does not require file uploads** for the standard demo flows (work order sign-off uses text + dates; no SPA upload for profile, aircraft photos, or signature images). See [FINAL_QA_REPORT.md](../operations/FINAL_QA_REPORT.md) for verification details.

**Render free tier:**

- The backend filesystem is **ephemeral**. Files saved via Django admin (e.g. `profile_img`) are **lost** on redeploy or restart.
- **Persistent disks are not available** on free web services. Disks require a **paid** web service. See [Render persistent disks](https://render.com/docs/disks).

**When you upgrade to a paid backend (optional, post-closeout):**

1. Backend service → **Disks** → Add disk, mount path **`/var/data`** (only files under this path persist).
2. Set environment variable: **`MEDIA_ROOT=/var/data/media`**
3. Configure Django `MEDIA_URL` and media serving (not included in the current codebase — implement before relying on uploads in production).
4. Redeploy and run the persistence test in [FINAL_QA_REPORT.md §2.8](../operations/FINAL_QA_REPORT.md).

Do **not** expect uploaded images to survive deploys on the **free** API service.

---

## Environment variable reference

Variables **read by application code** (from `backend/config/settings.py` and `frontend/src/shared/Api.js`):

### Backend

| Variable | Used in | Required | Default / fallback | Local | Render |
|----------|---------|----------|-------------------|-------|--------|
| `SECRET_KEY` | `settings.py` | Yes | `dev-secret-key` (unsafe) | Set in `.env` | **Set** — random string |
| `DEBUG` | `settings.py` | No | `False` | `True` in `.env` | **`False`** |
| `DATABASE_URL` | `settings.py` | Yes* | unset | Usually unset | **Set** (Internal URL) |
| `DB_NAME` | `settings.py` | Yes* | — | Set when no `DATABASE_URL` | Omit if `DATABASE_URL` set |
| `DB_USER` | `settings.py` | Yes* | — | Set when no `DATABASE_URL` | Omit |
| `DB_PASSWORD` | `settings.py` | Yes* | — | Set when no `DATABASE_URL` | Omit |
| `DB_HOST` | `settings.py` | Yes* | — | Set when no `DATABASE_URL` | Omit |
| `DB_PORT` | `settings.py` | Yes* | — | Set when no `DATABASE_URL` | Omit |
| `ALLOWED_HOSTS` | `settings.py` | No | `localhost,127.0.0.1` | Optional | **Set** to API hostname |
| `CORS_ALLOWED_ORIGINS` | `settings.py` | No | empty (+ localhost always) | Optional | **Set** to frontend origin |

\* Either `DATABASE_URL` **or** all five `DB_*` variables must be provided. If `DATABASE_URL` is non-empty, `DB_*` are ignored.

`DJANGO_SETTINGS_MODULE` is set by `manage.py` / gunicorn to `config.settings` — do not add to Render unless you have a custom settings module.

### Frontend

| Variable | Used in | Required | Default / fallback | Local | Render |
|----------|---------|----------|-------------------|-------|--------|
| `REACT_APP_API_URL` | `shared/Api.js` | No | `http://127.0.0.1:8000/api` | `frontend/.env` | **Set** at build time |

No other `REACT_APP_*` variables are referenced in the frontend source.

### Not in code (documentation / future only)

| Variable | Notes |
|----------|--------|
| `MEDIA_ROOT` | Planned for paid Render persistent disk; **not** read by `settings.py` today. |

---

## Deployment readiness checklist

Use this before client demo or production cutover. Copy from `backend/.env.example` and `frontend/.env.example` for local parity.

### Repository / config

- [ ] `backend/.env` exists locally (from `.env.example`), not committed
- [ ] `frontend/.env` exists locally (from `.env.example`), not committed
- [ ] Latest `main` includes JWT blacklist app (`rest_framework_simplejwt.token_blacklist`) and migrations

### Render — PostgreSQL

- [ ] Database created in same region as backend
- [ ] **Internal Database URL** copied for backend `DATABASE_URL`
- [ ] **External Database URL** saved if you need local `createsuperuser` (free tier)

### Render — backend (Web Service)

- [ ] Root Directory: `backend`
- [ ] Build: `pip install poetry && poetry config virtualenvs.create false && poetry install`
- [ ] Start: `python manage.py collectstatic --noinput && python manage.py migrate && gunicorn config.wsgi:application`
- [ ] `DATABASE_URL` = Internal Database URL
- [ ] `SECRET_KEY` = long random (not default)
- [ ] `DEBUG` = `False`
- [ ] `ALLOWED_HOSTS` = backend hostname only (e.g. `alpha-aviation-dev.onrender.com`)
- [ ] `CORS_ALLOWED_ORIGINS` = frontend origin (e.g. `https://alpha-aviation-dev-1.onrender.com`)
- [ ] Deploy succeeded; logs show migrate completed (including `token_blacklist` tables)
- [ ] `GET https://<backend>/api/health/` returns `{"status":"ok"}`

### Render — frontend (Static Site)

- [ ] Root Directory: `frontend`
- [ ] Build: `npm install -g yarn && yarn install && yarn build`
- [ ] Publish Directory: `build`
- [ ] `REACT_APP_API_URL` = `https://<backend-host>/api` (no trailing slash)
- [ ] Rewrite: `/*` → `/index.html` (Rewrite, not Redirect)
- [ ] Deploy succeeded

### Auth / smoke (production)

- [ ] Superuser or demo user exists in **deployed** database
- [ ] Login at `https://<frontend>/login` succeeds
- [ ] Logout succeeds (no 400 in Network tab on `POST /api/auth/logout/`)
- [ ] Role landing page loads (e.g. Management, Maintenance, Pilot)
- [ ] Django admin loads at `https://<backend>/admin/`

### Known limitations (free tier — acceptable for demo)

- [ ] Team aware: no persistent file uploads ([FINAL_QA_REPORT.md](../operations/FINAL_QA_REPORT.md))
- [ ] Postgres free tier expiry / sleep documented for stakeholders

---

## Optional: other hosts

- **Railway** — Can run backend + frontend + PostgreSQL; similar flow.
- **Vercel (frontend) + Render (backend)** — Deploy React on Vercel and set `REACT_APP_API_URL` to your Render backend URL + `/api`.
