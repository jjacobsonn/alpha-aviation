# Production Readiness Roadmap

**Status:** Active — pre-production gate  
**Last updated:** May 2026  
**Audience:** Engineering, QA, release owners

---

## Purpose

`docs/features/PHASE2_ACCEPTANCE_CRITERIA.md` tracks **feature delivery** for Phase 2. It is **not** a production go-live checklist.

This document defines the **ordered work** required to reach production readiness for a **hosted multi-tenant web application**. Complete each phase and its exit criteria before treating the next phase as done.

**Staff-level bar:** Ship to **dev/staging** for user feedback at any time. Do **not** promote to production multi-tenant hosting until the **Phase 7 release gate** passes on staging.

**Related docs:**

| Doc | Role |
|-----|------|
| [PHASE2_ACCEPTANCE_CRITERIA.md](../features/PHASE2_ACCEPTANCE_CRITERIA.md) | Feature checklist (23/24 MVP items) |
| [features/PHASE2_MVP.md](../features/PHASE2_MVP.md) | Phase 2 implementation notes |
| [rbac/RBAC_MVP_MATRIX.md](../rbac/RBAC_MVP_MATRIX.md) | RBAC source of truth |
| [deployment/DEPLOYMENT.md](../deployment/DEPLOYMENT.md) | Render deploy runbook |
| [setup/DEVELOPMENT.md](../setup/DEVELOPMENT.md) | Local dev and testing |

---

## What “production ready” means here

| In scope | Out of scope for this gate (unless promoted) |
|----------|-----------------------------------------------|
| Multi-tenant SaaS (≥2 companies on staging) | MDV-004 dashboard drag-and-drop |
| Roles: owner, manager, mechanic, dispatcher, pilot, platform admin | Site-wide user search in palette |
| PII + operational records + compliance CSV export | Component ↔ work order auto-linking |
| Render (or equivalent) with `DEBUG=False` staging | Full WCAG certification |

---

## Priority stack (one line)

```text
1. Tenant isolation on all APIs
2. JWT blacklist + auth hardening
3. RBAC on mutations (backend is source of truth)
4. CI + fix failing tests + isolation/RBAC tests
5. Observability + staging configuration
6. Error boundaries + failure UX
7. Formal sign-off on staging
```

---

## Phase 0 — Freeze scope and define production (1–2 days)

**Goal:** Stop scope creep; align the team on the release bar.

### Tasks

1. **Write a one-page production definition** (environments, roles, data classes, explicit non-goals).
2. **Environment model:** `dev` → `staging` (multi-tenant, prod-like config) → `production`.
   - Staging must include **≥2 companies** and realistic row counts—not a single demo tenant.
3. **Assign owners:** tenant isolation (backend), auth/client (frontend), CI/ops, QA sign-off.

### Exit criteria

- [ ] Signed “go-live bar” agreed by engineering + product/ops
- [ ] Staging environment exists and is distinct from dev

---

## Phase 1 — Blockers: tenant isolation (do first)

**Goal:** A user at Company A cannot read or mutate Company B data via any API.

Nothing else matters until this phase passes.

### 1.1 Audit every API entry point

Inventory all routes in `backend/api/urls.py` and DRF router ViewSets. For each endpoint, record:

| Endpoint | Scoped by company? | Role check? | Notes / owner |
|----------|-------------------|-------------|---------------|
| *(fill during audit)* | | | |

Pay special attention to ViewSets using `queryset = Model.objects.all()` without `get_queryset()` filtering.

### 1.2 Fix cross-tenant leaks (required order)

| # | Surface | Required change |
|---|---------|-----------------|
| 1 | `FlightViewSet` | `get_queryset()` company-scoped; tighten `permission_classes` by action |
| 2 | `ProfileViewSet` | `get_queryset()` → same company only; managers list tenant users only |
| 3 | `CompanyViewSet` | Platform-admin-only **or** single `request.user.company`; never all companies for tenant managers |
| 4 | `PartViewSet` | Document catalog model; scope reads/writes to tenant or explicit global policy |
| 5 | `IsCompanyMember.has_object_permission` | **Deny by default** (`return False`), not permissive fallback |

**Known risk areas (as of May 2026 review):**

- `CompanyViewSet` — `queryset = Company.objects.all()`, `IsManagerOrOwner`
- `ProfileViewSet` — `queryset = Profile.objects.all()`
- `FlightViewSet` — `queryset = Flight.objects.all()`, `IsAuthenticated` only
- `permissions.IsCompanyMember` — object permission fallback returns `True`

### 1.3 Lock down admin / cross-tenant surfaces

- [ ] Frontend `/admin/companies/*` → **platform admin only** (not `manager`)
- [ ] `GET/POST /api/companies/` → platform admin only (or remove from tenant managers)
- [ ] `X-Company-Id` header honored **only** for `is_staff` / `is_superuser`; audit-log usage

### 1.4 Negative multi-tenant tests

For each fixed ViewSet, add tests proving:

- User A cannot `GET` / `PATCH` / `DELETE` Company B’s resource by ID
- Manager A cannot list Company B’s flights, profiles, or companies

### Exit criteria

- [ ] Audit table complete and reviewed
- [ ] All items in §1.2 merged
- [ ] Automated negative tenant tests green
- [ ] Manual pen-test on staging with two companies (all roles)

---

## Phase 2 — Blockers: session and auth security

**Goal:** Reliable session lifecycle and baseline auth hardening.

### 2.1 JWT blacklist (currently misconfigured)

`SIMPLE_JWT` sets `BLACKLIST_AFTER_ROTATION: True`, but `rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`. Logout calls `token.blacklist()` and may fail or no-op.

1. Add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS`
2. Run migrations for blacklist tables
3. Verify `POST /api/auth/logout/` blacklists refresh token
4. Add test: logout → refresh with old token → **401**

### 2.2 Token storage (choose a path)

| Option | Effort | Security |
|--------|--------|----------|
| **A (recommended)** | Higher | httpOnly Secure cookies for refresh; short-lived access in memory or cookie |
| **B (minimum interim)** | Lower | Keep `localStorage` but strict CSP, XSS review, shorter access TTL; document accepted risk |

### 2.3 Auth hardening checklist

- [ ] Rate limit `POST /api/auth/login/` and `POST /api/auth/token/refresh/`
- [ ] Remove `SECRET_KEY` default — fail startup if unset when `DEBUG=False`
- [ ] Production Django settings (env-driven):
  - `SECURE_SSL_REDIRECT`
  - `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`
  - `SECURE_HSTS_SECONDS` (enable preload when stable)
  - `CSRF_TRUSTED_ORIGINS` includes staging + production frontend URLs
- [ ] Revisit `SessionAuthentication` on API — remove from DRF defaults if JWT-only

### Exit criteria

- [ ] Logout revokes refresh tokens (tested)
- [ ] Brute-force throttling active on auth endpoints
- [ ] Staging runs `DEBUG=False` with no default secrets

---

## Phase 3 — RBAC enforcement inside a tenant

**Goal:** Backend matches [RBAC_MVP_MATRIX.md](../rbac/RBAC_MVP_MATRIX.md). Frontend route guards are UX only.

### 3.1 Normalize permissions

1. Shared backend helper pattern (e.g. `can(user, resource, action)`)
2. Apply to mutation paths:
   - Work orders (create / update / delete)
   - Discrepancies
   - Flight dispatch
   - Fleet maintenance intervals

### 3.2 Close documented matrix gaps

| Rule | Enforcement target |
|------|-------------------|
| Owner-only delete | Work orders, discrepancies, fleet intervals — every `destroy` path |
| Pilot | No WO/parts/fleet mutations; own discrepancies/flight requests only |
| Dispatcher | No component history; scoped flight/discrepancy access |
| Mechanic | No delete; supervised edits per matrix |

### 3.3 Object-level rules

- [ ] Pilot edits only **own** discrepancy / flight request
- [ ] Mechanic cannot reassign or close WO unless matrix allows

### 3.4 Tests

Add integration tests: **one positive + one negative** per role × sensitive endpoint (see matrix “Gaps To Resolve” section).

### Exit criteria

- [ ] RBAC matrix rows covered by automated tests
- [ ] No `IsAuthenticated`-only update on operational records without role checks

---

## Phase 4 — Test and CI discipline

**Goal:** No merge to `main` without green automated checks.

### 4.1 Fix test infrastructure

| Area | Action |
|------|--------|
| Backend | Ephemeral DB per run (in-memory SQLite or fresh DB); remove persistent `test_db.sqlite3` anti-pattern in `config/settings_test.py` |
| Frontend | Fix failing suites; prioritize auth, RBAC, critical forms |
| Monorepo | Single entry point, e.g. `npm run test:all` → backend pytest + frontend `yarn test --watchAll=false` |

### 4.2 CI pipeline (minimum: GitHub Actions)

On every PR to `main`:

```text
lint (optional) → backend pytest → frontend test --watchAll=false → frontend build → django migrate --check
```

- Fail PR if any step fails
- No deploy to staging/production from a red commit

### 4.3 Phase 2 smoke coverage (minimum)

Cover via API integration tests and/or Playwright:

1. Login → management dashboard → fleet availability API
2. Analytics for owner; **403** for pilot
3. Service history search + pagination
4. Component history search + CSV export
5. Site search (`Ctrl+K`) returns role-scoped groups
6. Two-tenant isolation scenario

### Exit criteria

- [ ] CI green on `main`
- [ ] PRs cannot merge when CI is red
- [ ] Smoke scenarios above automated

---

## Phase 5 — Operational hardening

**Goal:** Debug production incidents in minutes, not hours.

### 5.1 Observability

- [ ] Structured logging (JSON): `request_id`, `user_id`, `company_id`
- [ ] Error tracking (e.g. Sentry) on backend + frontend
- [ ] Health check includes DB connectivity (for load balancers)
- [ ] No `console.warn` / `console.error` noise in production frontend builds

### 5.2 Deployment safety

- [ ] Secrets never in git; `.env` in `.gitignore`; rotate per environment
- [ ] Document rollback (previous Render deploy + migration policy)
- [ ] Staging mirrors prod: CORS, `ALLOWED_HOSTS`, `DEBUG=False`
- [ ] Single source of truth for live URLs (README vs deployment doc)

### 5.3 Performance and data honesty (before scale)

- [ ] DB indexes for history/search `icontains` fields (or `pg_trgm` / narrowed search)
- [ ] UI labels for analytics assumptions (e.g. 12h/day available hours, labor proxy fallback)
- [ ] Load-test search with realistic tenant row counts

### Exit criteria

- [ ] On-call can trace a failed request from logs/error tracker
- [ ] Staging deploy procedure matches [DEPLOYMENT.md](../deployment/DEPLOYMENT.md) with prod-like env

---

## Phase 6 — Frontend production UX

**Goal:** Failures degrade gracefully; users understand access denial.

### Tasks

- [ ] React **Error Boundary** at app shell + layout
- [ ] Consistent loading / error / empty states on Phase 2 pages (analytics, history, search)
- [ ] Wrong role → **403 / Not allowed** page, not redirect to `/login`
- [ ] Keyboard-operable site search palette
- [ ] Responsive tables on history pages (scroll or card fallback on small screens)

### Exit criteria

- [ ] Single component render error does not white-screen the entire app
- [ ] Spot-check accessibility on login, search dialog, primary forms

---

## Phase 7 — Formal release gate (staging)

Run on **staging** with **two companies** and **all roles**. All must pass before production.

| # | Gate | Pass |
|---|------|------|
| 1 | Cross-tenant isolation tests green | ☐ |
| 2 | JWT logout / blacklist verified | ☐ |
| 3 | RBAC matrix integration tests green | ☐ |
| 4 | CI green on release commit | ☐ |
| 5 | Phase 2 smoke scenarios pass | ☐ |
| 6 | `DEBUG=False`, HTTPS, CORS, `ALLOWED_HOSTS` correct | ☐ |
| 7 | No default / shared secrets across environments | ☐ |
| 8 | Error tracking receiving events from staging | ☐ |
| 9 | Component history CSV export manually verified | ☐ |
| 10 | Runbook: deploy, rollback, on-call contact | ☐ |

**Sign-off:**

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| QA | | |
| Release owner | | |

---

## Suggested timeline (focused team)

| Phase | Duration |
|-------|----------|
| 0 — Scope | 1–2 days |
| 1 — Tenant isolation | 3–5 days |
| 2 — Auth / security | 2–4 days |
| 3 — In-tenant RBAC | 3–5 days |
| 4 — CI + tests | 3–5 days (can overlap 2–3) |
| 5 — Ops | 2–3 days |
| 6 — Frontend UX | 2–4 days |
| 7 — Staging soak + gate | 3–5 days |

**Total (sequential):** ~3–5 weeks with this as top priority.

---

## Explicitly defer until after gate

Do **not** block production readiness on:

- New Phase 2 features (MDV-004, user search, component ↔ WO auto-link)
- Performance micro-optimizations before isolation tests exist
- Docker / Kubernetes migration (Render is acceptable with solid CI + config)
- Full WCAG audit (targeted fixes in Phase 6 are enough for v1)

---

## Review history

| Date | Author | Notes |
|------|--------|-------|
| May 2026 | Engineering review | Initial roadmap from production readiness assessment |
