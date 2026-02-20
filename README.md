# Alpha Aviation (monorepo)

Backend and frontend for Alpha Aviation, combined in a single repo.

## Structure

- **`/backend`** — Aviation backend service (see `backend/README.md` for details).
- **`/frontend`** — Aviation web app (see `frontend/README.md` for details).

## How to run

### Backend

```bash
cd backend
# Install dependencies (adjust for your package manager)
npm install
# Start dev server (adjust script name to match backend/package.json)
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Adjust commands to match each project’s README (e.g. `yarn`, `pnpm`, or different scripts like `npm run serve`).

## Merging this monorepo

See **MERGE_GUIDE.md** for how the repos were combined and how to verify history.
