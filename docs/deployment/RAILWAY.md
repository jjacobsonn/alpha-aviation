# Deploy Alpha Aviation on Railway

Production runs on [Railway](https://railway.app). The monorepo deploys as **PostgreSQL + API + web** services connected to the same GitHub repo.

## Live URLs

| Service | URL |
|---------|-----|
| Web app | https://alpha-aviation-web-production.up.railway.app/ |
| API | https://alpha-aviation-production.up.railway.app/api/ |
| Django admin | https://alpha-aviation-production.up.railway.app/admin/ |

Demo credentials: [README.md § Demo credentials](../../README.md#demo-credentials).

## Services

| Railway service | Build config | Role |
|-----------------|--------------|------|
| **PostgreSQL** | Railway plugin | Primary database; API connects via `DATABASE_URL` |
| **API** | Root `railway.toml` → `Dockerfile.railway-api` | Django REST API, admin, static (WhiteNoise) |
| **Web** | `frontend/railway.toml` → `frontend/Dockerfile` | React SPA; calls API at `REACT_APP_API_URL` |

Connect the GitHub repo to each service. Auto-deploy on push to `main` is typical.

## Environment variables

Copy from `backend/.env.example` and `frontend/.env.example`. Key production values:

### API service

| Variable | Example / notes |
|----------|-----------------|
| `SECRET_KEY` | Long random string (required) |
| `DEBUG` | `False` |
| `DATABASE_URL` | From Railway Postgres → **Connect** (internal URL preferred) |
| `ALLOWED_HOSTS` | API hostname only, e.g. `alpha-aviation-production.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | Web origin, e.g. `https://alpha-aviation-web-production.up.railway.app` |

Startup (in `Dockerfile.railway-api`): `collectstatic`, `migrate`, then Gunicorn on `$PORT`.

### Web service

| Variable | Example / notes |
|----------|-----------------|
| `REACT_APP_API_URL` | `https://alpha-aviation-production.up.railway.app/api` (no trailing slash) |

Set before build — CRA bakes this in at compile time. Redeploy web after changing.

## Re-seed demo data

From `backend/` with the Railway Postgres **public** `DATABASE_URL`:

```bash
export DATABASE_URL='postgresql://...'

poetry run python manage.py bootstrap_horizon_demo
poetry run python manage.py bootstrap_cascade_demo
poetry run python manage.py bootstrap_parts_and_tools --company-id 1
poetry run python manage.py bootstrap_labor_entries
```

Commands are idempotent. See [README.md § Re-seed demo data](../../README.md#re-seed-demo-data).

## Post-deploy smoke test

- [ ] App login page loads at web URL
- [ ] Login as `marcus.hale` / `Demo2026!` (Horizon owner)
- [ ] API health or authenticated request succeeds
- [ ] Django admin loads at `/admin/`
- [ ] Logout succeeds (no 400 on `POST /api/auth/logout/`)

## Related docs

- Env variable reference (Render-era naming still applies): [DEPLOYMENT.md § Environment variable reference](DEPLOYMENT.md#environment-variable-reference)
- Production readiness checklist: [../operations/PRODUCTION_READINESS_ROADMAP.md](../operations/PRODUCTION_READINESS_ROADMAP.md)
- Closeout QA / known limits: [../operations/FINAL_QA_REPORT.md](../operations/FINAL_QA_REPORT.md)
- **Historical Render runbook:** [DEPLOYMENT.md](DEPLOYMENT.md) (previous hosting; useful if redeploying on Render)
