# Git hygiene — what to commit

## Do not commit

| Item | Why |
|------|-----|
| `node_modules/` | Installed packages; huge and machine-specific |
| `.env` (any real env file) | Secrets, API URLs for your machine, DB passwords |
| `package-lock.json` | Duplicate of Yarn lock in frontend; use one package manager |
| `frontend/build/` | Generated production bundle |
| `__pycache__/`, `.venv/` | Python caches and local virtualenvs |
| Passwords, API keys, Railway tokens | Set in Railway dashboard or local `.env` only |

## Do commit (safe and needed)

| Item | Why |
|------|-----|
| `package.json`, `frontend/package.json` | Declares dependencies (not the installed code) |
| `frontend/yarn.lock` | Pins frontend versions for `yarn install --frozen-lockfile` on Railway |
| `backend/poetry.lock` | Pins backend versions for `poetry install` on Railway |
| `*.env.example` | Template with placeholder values only |

## Local setup

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit with your local values — never commit .env
```

## Deployment

Railway does **not** use your laptop’s `node_modules` or `.env` from git. Set `REACT_APP_API_URL`, `SECRET_KEY`, `DATABASE_URL`, etc. in the Railway service variables. Frontend production deploy can use `Dockerfile.production` with a local `yarn build` or `frontend/Dockerfile` which installs from `yarn.lock` inside the image.
