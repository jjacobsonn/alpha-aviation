# RBAC and Login Verification

This project now uses a centralized role-to-landing mapping in `frontend/src/shared/rbac.js`.

## Default landing routes

- `owner` -> `/management`
- `manager` -> `/management`
- `mechanic` -> `/maintenance`
- `pilot` -> `/pilot-dashboard`
- `dispatcher` -> `/dispatcher-dashboard`
- `is_staff` or `is_superuser` -> `/site-admin`

## Critical behavior

- Login always calls `/api/users/me/` after token issuance.
- Frontend stores role and admin flags in `AppContext`.
- Protected routes use role checks and redirect unauthorized users back to `/login`.
- A role with no configured landing route remains on login with a clear error.

## Quick manual test plan

1. Start backend and frontend.
2. Log in with each role account:
   - owner
   - manager
   - mechanic
   - pilot
   - dispatcher
   - staff/superuser admin
3. Confirm each account lands on the expected dashboard.
4. Confirm navigation menu only shows role-allowed pages.
5. Confirm logout returns to `/login`.
6. Confirm relogin does not require manual browser refresh.

## Automated tests added

- `frontend/src/tests/shared/rbac.test.js`
- Updated route-guard and login tests:
  - `frontend/src/tests/components/ProtectedRoute.test.js`
  - `frontend/src/tests/pages/Login.test.js`
