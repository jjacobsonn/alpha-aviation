# Frontend QA Report 5/18/2026

-----
Test summary
-----
- Scope and organization: tests are written with Jest + React Testing Library and organized into root smoke tests, component unit suites, lightweight integration checks, and page-level behavior specs. Tests focus on rendering, form interactions, role-based UI flows, and basic accessibility/keyboard behavior where applicable.
- Representative modules:
	- Root: `App.test.js` — app bootstrap and render smoke.
	- Components: rendering, input validation, and form submission flows for forms and UI primitives (see `components/`).
	- Pages: page-level flows (Login, Maintenance, Fleet pages, WorkOrders, admin pages).
	- Integration: `integration/apiIntegration.test.js` — higher-level API/flow integration scenarios.

-----
Current status / patterns
-----
- Test stack: Jest (react-scripts), React Testing Library, user-event.
- Shared test helpers live in `src/tests/test-utils.js` for custom render wrappers and role fixtures.
- `frontend/src/setupTests.js` contains environment polyfills and mocks (for example, `react-modal` is mocked to avoid `setAppElement` issues in JSDOM).
- Tests favor behavior-driven assertions (user-visible results) and mock network calls for unit tests; a small integration suite exercises higher-level flows.
- CI-friendly runners: use `CI=true` (or the PowerShell equivalent) to force single-pass test runs and deterministic output.

-----
Current failing tests
-----
- None known at the time of this report. Run `npm test` in `frontend/` to surface any transient or environment-specific failures.

-----
New tests added
-----

- components/
	- components/AircraftSelector.test.js
	- components/DeleteConfirmationDialog.test.js
	- components/Discrepancy.test.js
	- components/KPICard.test.js
	- components/Layout.test.js
	- components/StatCard.test.js
	- components/WorkOrder.test.js

- pages/
	- pages/AdminCompanies.test.js
	- pages/AdminCompanyForm.test.js
	- pages/CompanyOverview.test.js
	- pages/DispatcherDashboard.test.js
	- pages/FleetDetailPage.test.js
	- pages/FleetPage.test.js
	- pages/Management.test.js
	- pages/PilotDashboard.test.js
	- pages/SiteAdminPortal.test.js
	- pages/WorkOrders.test.js

- shared/
	- shared/rbac.test.js

These additions expand coverage for admin flows, fleet pages, KPI/display components, and RBAC behaviors.

-----
New tests / recommendations
-----
- Add focused accessibility assertions (role/aria checks and keyboard flows) to key components like `NavigationDrawer` and form dialogs.
- Expand integration scenarios to cover form submission end-to-end (component → page → mocked API → navigation) for at least one representative flow per major page.
- Consider CI parallelization or test sharding if the suite grows to keep run times acceptable.

