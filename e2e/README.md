# End-to-end Testing

This folder contains the Playwright browser smoke tests for Alpha Aviation.

## What It Covers

- Login through the real frontend form.
- Redirects for protected routes when the user is not authenticated.
- Authenticated navigation and logout.

## Files

- `playwright.config.ts` wires the test projects, backend seed step, and local web server.
- `global-setup.ts` prepares a seeded backend user and writes authenticated storage state.
- `scripts/provision-e2e-user.py` seeds the database and creates the browser-test user.
- `tests/` holds the actual Playwright specs.

## Run It

From the repo root:

```bash
npm run test:e2e
```

To watch the browser:

```bash
npm run test:e2e:headed
```

## Notes

- The setup step is destructive to the local test database because it runs the existing Django `seed` command.
- The browser tests use a dedicated `e2e.mechanic` account with the password `E2Epass123!`.

