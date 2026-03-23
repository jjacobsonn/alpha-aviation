# Frontend Test Documentation (3-4-26)

This document summarizes the frontend test suites in `frontend/src/tests`, what each suite validates, and how to run them.

## Test Stack

- **Runner:** Jest (via `react-scripts test`)
- **DOM testing:** React Testing Library (`@testing-library/react`)
- **User interaction simulation:** `@testing-library/user-event`

## Folder Structure

- `App.test.js`
- `components/`
- `integration/`
- `pages/`


## Running Tests

From `frontend/`:

- Run all frontend tests:

```bash
npm test -- --watchAll=false
```

- Run a single test file:

```bash
npm test -- --watchAll=false --runTestsByPath src/tests/pages/Login.test.js
```

- Run multiple specific files:

```bash
npm test -- --watchAll=false --runTestsByPath src/tests/pages/Login.test.js src/tests/pages/Maintenance.test.js
```

## Suite Coverage

### Root

- **`App.test.js`**
	- Smoke test that renders the root app component without crashing.
	- Mocks API bootstrap calls so render can be tested in isolation.

### Components

- **`components/AddWorkOrderForm.test.js`**
	- Rendering checks for all required fields and controls.
	- Input behavior checks for text, date, numeric, and file fields.
	- Validation checks for required fields and error messages.
	- Submission flow checks (success path, form reset, cancel behavior, optional fields).

- **`components/AddDiscrepancyForm.test.js`**
	- Same test categories as AddWorkOrderForm: rendering, inputs, validation, submit/cancel, optional fields.
	- Ensures discrepancy-specific required field rules are enforced.

- **`components/NavigationDrawer.test.js`**
	- Rendering and layout behavior.
	- Sidebar toggle behavior.
	- Main navigation item behavior.
	- Account menu and logout behavior.
	- Keyboard/accessibility checks and selected-tab/icon behavior.

- **`components/ProtectedRoute.test.js`**
	- Loading state behavior before auth initialization.
	- Redirect behavior for unauthenticated users.
	- Child rendering for authenticated users.

- **`components/LandingPage.test.js`**
	- Navigation bar, hero, “What We Do,” benefits, CTA, and footer presence/behavior.
	- Basic navigation interactions from landing actions.

- **`components/FleetStatusPanel.test.js`**
	- Suite currently marked with `describe.skip`.
	- Tests are retained but intentionally not run because the component is currently unused.

### Integration

- **`integration/apiIntegration.test.js`**
	- Authentication integration scenarios.
	- API error-handling integration scenarios.

### Pages

- **`pages/Login.test.js`**
	- Basic page render checks.
	- Redirect-on-existing-token behavior.
	- Successful sign-in behavior (API call + navigation).
	- Failed sign-in error rendering.
	- Password visibility toggle behavior.

- **`pages/Maintenance.test.js`**
	- Basic page render checks (KPI cards/section headings).
	- Modal open/close behavior for add work order and add discrepancy actions.
	- Focused on page-level behavior (form internals are tested in component suites).

- **`pages/NotFound.test.js`**
	- 404 page smoke checks.
	- “Go to Login” navigation action.

- **`pages/PartsPage.test.js`**
	- Minimal smoke checks for top-level UI.
	- Basic actions menu open/close interaction.
	- Intentionally avoids assertions tied to placeholder/sample inventory data.

## Notes

- Page tests are intentionally lightweight and centered on user-visible behavior.
- Detailed field validation and form workflow logic are covered in component-level tests.
