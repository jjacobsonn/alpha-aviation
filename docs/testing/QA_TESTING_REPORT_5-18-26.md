# Status report of the frontend, backend, and end-to-end tests

---

# Frontend

## Running

From the repo root, run the frontend unit tests (Create React App):

```bash
cd frontend
npm test
```

Or run a single pass (CI mode) and collect coverage:

```bash
CI=true npm test -- --coverage --watchAll=false
```

PowerShell (Windows) one-liner equivalent:

```powershell
$env:CI = 'true'; npm test -- --coverage --watchAll=false
```

## Failing tests

- Currently none

## Tests skipped

- `components/LandingPage.test.js` (LandingPage.js component is currently unused)
- `components/FleetStatusPanel.test.js` (FleetStatusPanel.js component is currently unused)

> For more details, see the [frontend test report](frontend/FrontendTests_5-28-26.md)

---

# Backend

## Running

From the `backend` directory run the pytest-based backend API suite:

```bash
cd backend
python -m pytest api/testing -q
```

Run a specific test file, for example views tests:

```bash
python -m pytest api/testing/test_views.py -q
```

Run with coverage report:

```bash
python -m pytest --cov=api --cov-report=term-missing api/testing -q
```


## Failing tests

- Two tests currently fail due to a missing django admin site register (see the backend test report)

> For more details, see the [backend test report](backend/BackendTests_5-28-26.md).

---

# End-to-end

## Running the e2e tests

From the repo root:

```bash
npm run test:e2e
```

To run the browser tests with a visible window:

```bash
npm run test:e2e:headed
```

## Coverage

- Playwright browser smoke tests live in `e2e/` and run from the repo root with `npm run test:e2e`.
- The suite currently covers 3 flows: anonymous redirect protection, UI login, and an authenticated protected-page + logout smoke test.
- Test setup seeds a dedicated `e2e.mechanic` user and writes temporary auth storage state for the authenticated project.
- The login spec has been validated to avoid the password-field selector collision from the MUI visibility toggle button.

## Failing tests

- Currently none

> For more details, see the [end-to-end test guide](e2e.md).