# Deploy to a live URL (fast path)

**Goal:** Host the app so it’s available at a URL and **auto-deploys when you push to `main`** on GitHub.

**Recommended: [Render](https://render.com)** — free tier, connects to GitHub, supports Django + React + PostgreSQL in one place.

---

## 1. Create a Render account and connect GitHub

1. Go to [render.com](https://render.com) and sign up (or use GitHub login).
2. **Dashboard → Account Settings → Connect GitHub** and authorize the `Alpha-Aviation-e2i/alpha-aviation` repo.

---

## 2. Create a PostgreSQL database

1. **Dashboard → New + → PostgreSQL**.
2. Name it (e.g. `alpha-aviation-db`), pick a region, leave the rest default.
3. Click **Create Database**.
4. In the database’s **Info** tab, copy:
   - **Internal Database URL** (use this for the backend service).

---

## 3. Deploy the backend (Django)

1. **Dashboard → New + → Web Service**.
2. Connect the repo **Alpha-Aviation-e2i/alpha-aviation**.
3. Configure:
   - **Name:** `alpha-aviation-backend` (or any name).
   - **Region:** same as the database.
   - **Branch:** `main`.
   - **Root Directory:** `backend`.
   - **Runtime:** `Python 3`.
   - **Build Command:** `pip install poetry && poetry config virtualenvs.create false && poetry install && python manage.py migrate`
   - **Start Command:** `gunicorn config.wsgi:application`
4. **Environment:**
   - Add variables (use the values from your DB and the Internal Database URL):
     - `SECRET_KEY` — a long random string (e.g. from `python -c "import secrets; print(secrets.token_urlsafe(32))"`).
     - `DEBUG` — `False`.
     - `DB_NAME` — from the DB URL (e.g. database name in the URL).
     - `DB_USER` — from the DB URL.
     - `DB_PASSWORD` — from the DB URL.
     - `DB_HOST` — from the DB URL (Render gives an internal hostname).
     - `DB_PORT` — usually `5432`.
   - Or use **Render’s “Internal Database URL”** and in Django parse it: add `dj-database-url` and set `DATABASES['default'] = dj_database_url.config(...)` if you prefer a single URL.
5. **Create Web Service**. Render will build and deploy. Note the service URL (e.g. `https://alpha-aviation-backend.onrender.com`).

**CORS:** In the backend service’s Environment on Render, add:
- `CORS_ALLOWED_ORIGINS` = your frontend URL, e.g. `https://alpha-aviation-frontend.onrender.com` (no spaces; the backend reads this from env).

---

## 4. Deploy the frontend (React)

1. **Dashboard → New + → Static Site**.
2. Connect the same repo **Alpha-Aviation-e2i/alpha-aviation**.
3. Configure:
   - **Name:** `alpha-aviation-frontend`.
   - **Branch:** `main`.
   - **Root Directory:** `frontend`.
   - **Build Command:** `npm install -g yarn && yarn install && yarn build`
   - **Publish Directory:** `build`.
4. **Environment:** Add:
   - `REACT_APP_API_URL` — your **backend** URL from step 3 with `/api` (e.g. `https://alpha-aviation-backend.onrender.com/api`).
5. **Create Static Site**. Render will build and deploy. Your app will be at a URL like `https://alpha-aviation-frontend.onrender.com`.

---

## 5. Point backend CORS at the frontend URL

In the **backend** Web Service on Render → **Environment**, add:

- **Key:** `CORS_ALLOWED_ORIGINS`  
- **Value:** your frontend URL, e.g. `https://alpha-aviation-frontend.onrender.com`

(The backend reads this and allows that origin. No code change needed.) Save and redeploy if the backend was already created.

---

## 6. Result

- **Frontend:** `https://<your-frontend-name>.onrender.com` — your main link to share.
- **Backend API:** `https://<your-backend-name>.onrender.com/api` — used by the frontend.
- Every **push to `main`** triggers a new deploy for both (or the one you changed).

---

## Optional: single-URL alternatives

- **Railway** — Also connects to GitHub, can run backend + frontend + PostgreSQL; good if you prefer one dashboard for everything.
- **Vercel (frontend) + Render (backend)** — Use Vercel for the React app (very fast CDN) and Render for Django + DB; set `REACT_APP_API_URL` in Vercel to your Render backend URL.

For “fastest and easiest” with one place for repo, backend, DB, and frontend, Render is a strong choice.
