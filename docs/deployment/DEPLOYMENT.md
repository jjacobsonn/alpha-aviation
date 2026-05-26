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
4. **Environment variables** (backend service → Environment):

   | Key | Value |
   |-----|--------|
   | `DATABASE_URL` | Paste the **Internal Database URL** from the Postgres service (Info/Connect). |
   | `SECRET_KEY` | Long random string, e.g. from `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`. |
   | `DEBUG` | `False` |
   | `ALLOWED_HOSTS` | Backend hostname only, e.g. `alpha-aviation-dev.onrender.com` (no `https://`). |
   | `CORS_ALLOWED_ORIGINS` | Frontend URL only, e.g. `https://alpha-aviation-dev-1.onrender.com` (add this after the frontend is created). |

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
4. **Environment:**
   - **Key:** `REACT_APP_API_URL`
   - **Value:** Backend URL + `/api`, e.g. `https://alpha-aviation-dev.onrender.com/api`
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

## Optional: other hosts

- **Railway** — Can run backend + frontend + PostgreSQL; similar flow.
- **Vercel (frontend) + Render (backend)** — Deploy React on Vercel and point `REACT_APP_API_URL` at your Render backend URL.
