# Frontend

React 19 single-page app (Create React App) with Material UI, React Router, and Axios.

## Commands

```bash
yarn install
yarn start          # http://localhost:3000
yarn test
yarn build
```

Set `REACT_APP_API_URL=http://localhost:8000/api` in `.env` for local API access.

## Layout

| Path | Purpose |
|------|---------|
| `src/pages/` | Route-level page components |
| `src/components/` | Shared UI components |
| `src/shared/` | RBAC helpers, hooks, utilities |
| `src/tests/` | Jest test suites and helpers |

## Documentation

| Topic | Doc |
|-------|-----|
| Local setup | [docs/setup/DEVELOPMENT.md](../docs/setup/DEVELOPMENT.md) |
| RBAC | [docs/rbac/RBAC_MVP_MATRIX.md](../docs/rbac/RBAC_MVP_MATRIX.md) |
| Frontend tests | [docs/testing/frontend/](../docs/testing/frontend/) |
| Full index | [docs/README.md](../docs/README.md) |
