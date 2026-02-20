# Development guide — running and testing the full stack

This doc explains how to run backend and frontend together and how they connect, so you can develop and test the full app from the monorepo.

**New to the project?** → Go to [Database setup from scratch](#database-setup-from-scratch-walkthrough) for a full walkthrough (PostgreSQL install, create DB, `.env`, migrate, then run the app).

## How the two parts connect

- **Frontend** (React) runs on **http://localhost:3000** and calls the API using `REACT_APP_API_URL` (default: **http://localhost:8000/api**).
- **Backend** (Django) runs on **http://localhost:8000**, allows CORS from `localhost:3000`, and uses PostgreSQL for the database.

No code changes are required for local dev: the frontend already points at `localhost:8000` and the backend already allows the frontend origin. You only need to configure the backend with a database and env vars.

---

## Prerequisites

- **Node.js** and **Yarn** (for frontend)
- **Python 3.12+** and **Poetry** (for backend)
- **PostgreSQL** (for backend)

---

## Database setup from scratch (walkthrough)

Follow these steps to install PostgreSQL, create the database, and run the app. Commands are for **macOS** (Homebrew); adjust for your OS if needed.

### Step 1: Install PostgreSQL (if you don’t have it)

```bash
# Install PostgreSQL via Homebrew
brew install postgresql@16

# Start the service (and optionally enable on login)
brew services start postgresql@16
```

If you use a different major version (e.g. 15), replace `16` and use that version’s port if non-default. Default port is **5432**.

**Check it’s running:**

```bash
brew services list | grep postgresql
# or: pg_isready -h localhost
```

### Step 2: Create the database and (optional) user

PostgreSQL creates a default superuser `postgres` with no password on local installs. You can use that or create a dedicated user.

**Option A — Use default `postgres` user (simplest for local dev)**

```bash
# Connect as your macOS user (often has superuser rights)
psql postgres

# In the psql prompt:
CREATE DATABASE aviation;

# Optional: set a password for the postgres user (so backend .env can use it)
ALTER USER postgres WITH PASSWORD 'postgres';

# Exit
\q
```

If your Mac user isn’t a superuser, use:

```bash
psql -U postgres postgres
```

If that fails (no `postgres` user yet), try:

```bash
createuser -s postgres   # create superuser postgres
psql -U postgres postgres
```

**Option B — Create a dedicated app user and database**

```bash
psql postgres

-- In psql:
CREATE USER aviation_user WITH PASSWORD 'aviation_pass';
CREATE DATABASE aviation OWNER aviation_user;
GRANT ALL PRIVILEGES ON DATABASE aviation TO aviation_user;
\q
```

Then in `backend/.env` use `DB_USER=aviation_user`, `DB_PASSWORD=aviation_pass`, `DB_NAME=aviation`.

### Step 3: Backend `.env` and dependencies

From the **repo root**:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`. For Option A (default `postgres` user) you can use:

```env
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True

DB_NAME=aviation
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

Save the file. Then install Python deps and run migrations:

```bash
# Still in backend/
poetry install
poetry run python manage.py migrate
```

You should see migrations applied. If you get a connection error, double-check PostgreSQL is running, the database exists, and `DB_*` match what you created.

### Step 4: (Optional) Create a Django superuser

Useful for logging into Django admin (http://localhost:8000/admin):

```bash
cd backend
poetry run python manage.py createsuperuser
```

Enter username, email, and password when prompted.

### Step 5: Install frontend deps and root script

From the **repo root**:

```bash
npm install
```

This installs `concurrently` so `npm run dev` works. The frontend already has its own `.env` pointing at `http://localhost:8000/api`.

### Step 6: Run the full stack

From the **repo root**:

```bash
npm run dev
```

- **Backend:** http://localhost:8000 (API + Django admin if you created a superuser)
- **Frontend:** http://localhost:3000

Open the frontend in your browser; it will talk to the backend. You can log in via the app or, if you created a superuser, via http://localhost:8000/admin.

---

## One-time setup (summary)

If you’ve already done the database and env once, you only need:

### 1. Backend environment and database

1. PostgreSQL is running and the `aviation` database (and user) exists.
2. `backend/.env` is present and has correct `DB_*`, `SECRET_KEY`, and `DEBUG`.
3. Backend deps and migrations are done:

   ```bash
   cd backend
   poetry install
   poetry run python manage.py migrate
   ```

### 2. Frontend environment

The frontend already has a `.env` with `REACT_APP_API_URL=http://localhost:8000/api`. Install deps:

```bash
cd frontend
yarn install
```

### 3. Root (optional) — run both from monorepo root

```bash
npm install
```

---

## Running the full stack

### Option A: One command from root (recommended)

From the **repo root**:

```bash
npm run dev
```

This starts:

- **Backend** at http://localhost:8000 (Django)
- **Frontend** at http://localhost:3000 (React)

Logs from both appear in the same terminal with prefixes `[backend]` and `[frontend]`.

### Option B: Two terminals

**Terminal 1 — backend:**

```bash
cd backend
poetry run python manage.py runserver
```

**Terminal 2 — frontend:**

```bash
cd frontend
yarn start
```

Or use the root scripts: `npm run dev:backend` and `npm run dev:frontend` in separate terminals.

---

## Other useful root scripts

From the **repo root**:

| Command | Description |
|--------|-------------|
| `npm run dev` | Start backend + frontend together |
| `npm run dev:backend` | Start only the Django server |
| `npm run dev:frontend` | Start only the React dev server |
| `npm run install:all` | Run `poetry install` in backend and `yarn install` in frontend |

---

## Testing

### Backend

```bash
cd backend
poetry run python manage.py test
```

### Frontend

```bash
cd frontend
yarn test
```

Run both from root (two commands):

```bash
cd backend && poetry run python manage.py test
cd frontend && yarn test
```

---

## How to test that backend and frontend are working together

### 1. Test the backend on its own (no frontend)

With the **backend** running (`cd backend && poetry run python manage.py runserver` or `npm run dev:backend`):

**Option A — Quick script (recommended)**

From the repo root:

```bash
chmod +x scripts/test-backend.sh
./scripts/test-backend.sh
```

This checks: health endpoint → login with `admin` / `admin` → protected `/users/me/` with the returned token.

**Option B — Manual curl**

```bash
# Health
curl -s http://localhost:8000/api/health/
# Should return: {"status": "ok"}

# Login (use the same admin account you created)
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
# Should return JSON with "access", "refresh", and "user"

# User profile (replace TOKEN with the "access" value from login)
curl -s http://localhost:8000/api/users/me/ -H "Authorization: Bearer TOKEN"
# Should return your user (id, username, email, etc.)
```

If these all return 200 and the expected JSON, the **backend is working**.

### 2. How the frontend “tests” the backend (they’re connected here)

The frontend talks to the backend in two main ways:

1. **Login** — When you click **Sign in** on the login page, the app sends `POST /api/auth/login/` with username and password. The backend returns JWT `access` and `refresh` tokens. The frontend stores them and sends `Authorization: Bearer <access>` on later requests.
2. **Protected pages** — After login, the app redirects to `/management` (or the page you were trying to open). Any call to the API (e.g. loading data) uses the stored token. If the backend is down or returns 401, the frontend will redirect you back to `/login`.

So: **logging in successfully and reaching a post-login page is the main “test” that both frontend and backend are working together.**

### 3. Manual test: full stack in the browser

1. Start both: from repo root run **`npm run dev`** (backend on port 8000, frontend on port 3000).
2. Open **http://localhost:3000** in your browser.
3. Click **Login** (or go to http://localhost:3000/login).
4. Enter **Username:** `admin`, **Password:** `admin` (the Django superuser we created).
5. Click **Sign in**.

**If everything is connected:**

- You should be redirected to **/management** (or another app page).
- You should not see “Login failed” or stay on the login page.

**If you see “Login failed” or stay on login:**

- Backend might be stopped — check http://localhost:8000/api/health/ in another tab.
- Wrong credentials — use `admin` / `admin` (or run `poetry run python manage.py createsuperuser` in `backend/` to create another user).
- CORS/network — open the browser **Developer Tools → Network** tab, try logging in again, and check the request to `localhost:8000/api/auth/login/`: status should be 200, not blocked or CORS error.

### 4. Summary

| What you’re testing | How |
|--------------------|-----|
| Backend only       | Run `./scripts/test-backend.sh` or the curl commands above with backend running. |
| Frontend only      | Run `npm run dev:frontend`, open http://localhost:3000 — landing and login page should load. |
| **Both together** | Run `npm run dev`, open app, log in with `admin` / `admin`, confirm redirect to `/management` (or another protected page). |

---

## Quick checklist for “nothing works”

1. **Backend won’t start**  
   - `.env` exists in `backend/` and has correct `DB_*` and `SECRET_KEY`.  
   - PostgreSQL is running and the database exists.  
   - You ran `poetry install` and `poetry run python manage.py migrate`.

2. **Frontend can’t reach API**  
   - Backend is running on http://localhost:8000.  
   - `frontend/.env` has `REACT_APP_API_URL=http://localhost:8000/api` (or your backend URL).  
   - Restart the frontend after changing `.env`.

3. **CORS errors in browser**  
   - Backend `config/settings.py` already allows `http://localhost:3000` and `http://127.0.0.1:3000`.  
   - If you use another origin, add it to `CORS_ALLOWED_ORIGINS`.

4. **“DisallowedHost” from Django**  
   - Backend uses `ALLOWED_HOSTS` from env; default is `localhost,127.0.0.1`.  
   - If you use another host, set `ALLOWED_HOSTS` in `backend/.env` (comma-separated).
