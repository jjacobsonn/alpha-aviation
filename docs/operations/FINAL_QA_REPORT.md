# Final QA Report — Alpha Aviation Closeout

**Date:** May 2026  
**Scope:** Critical production blockers and closeout readiness (read-only verification + documented fixes).

**Related:**

- [CODEBASE_AUDIT_AND_QA_INVENTORY.md](./CODEBASE_AUDIT_AND_QA_INVENTORY.md)
- [PRODUCTION_READINESS_ROADMAP.md](./PRODUCTION_READINESS_ROADMAP.md)
- [DEPLOYMENT.md](../deployment/DEPLOYMENT.md)

---

## Executive summary

| Blocker | Status | Closeout impact |
|---------|--------|-----------------|
| JWT logout / token blacklist | **Fixed** (see §1) | Safe to test logout on staging/prod after `migrate` |
| Media / file upload persistence | **Documented — not required for demo** | No code change for closeout; **must fix before real production** if uploads matter |
| Render persistent disk | **Not available on free tier** | Cannot implement disk persistence without upgrading the web service |
| Environment variables | Documented in audit | Align Render dashboard with checklist below |

**Overall closeout confidence:** Suitable for **client demo** on current Render free tier **without file-upload features**. Not ready for production use that depends on stored images/signatures until media storage is implemented (paid disk or object storage).

---

## 1. JWT logout / token blacklist (fixed)

### Finding

`POST /api/auth/logout/` with a `refresh` body (what the frontend sends) returned **400** because `rest_framework_simplejwt.token_blacklist` was not in `INSTALLED_APPS`, while `logout()` called `RefreshToken.blacklist()`.

### Severity

**Critical** (resolved)

### Fix applied

- Added `rest_framework_simplejwt.token_blacklist` to `backend/config/settings.py`
- Strengthened `test_logout_authenticated` to send `refresh` and assert refresh fails after logout

### Deploy note

Run migrations on the backend (Render start command already includes `migrate`). New tables: `token_blacklist_*`.

### Manual test

See [CODEBASE_AUDIT_AND_QA_INVENTORY.md §1](./CODEBASE_AUDIT_AND_QA_INVENTORY.md) logout steps.

---

## 2. Media / file upload persistence

### 2.1 Are uploads required for the final demo?

**Conclusion: No.** The React app’s client/demo workflows do not upload files to the API today.

| Upload type | Model / field | Used in demo UI? | Evidence |
|-------------|---------------|------------------|----------|
| Work order signature image | `WorkOrder.signature`, `components_image` | **No** | Close-out uses `POST /workorders/:id/close/` (JSON: notes/labor). UI shows `signed_by` + `signature_date` text only (`Maintenance.js`). |
| Discrepancy signature image | `Discrepancy.signature` | **No** | Create/update via JSON; no `FormData` or file input on live pages. |
| Aircraft photos | `AircraftPhoto.image` | **No** | Serializer exposes `photos` on fleet detail (read-only). No upload UI in `FleetDetailPage.js`. |
| Profile image | `Profile.profile_img` | **No** | `AccountPage.js` PATCHes text fields only. Admin can set image in Django admin only. |
| Mechanic certificate / FAA auth images | `Mechanic.mechanic_certificate_img`, `authentication_img` | **No** | Not exposed in React app; admin/model only. |

**Stub / non-production UI:**

- `AddWorkOrderForm.js` / `AddDiscrepancyForm.js` have file inputs but **only `console.log`** — comment: *"later hook to API"*. Not imported by `Maintenance.js` (mocked in tests only).

**Backend today:**

- `settings.py` has **no** `MEDIA_ROOT` / `MEDIA_URL`.
- `config/urls.py` does **not** serve `/media/` in any environment.
- Uploads written via Django admin land under the app directory on ephemeral disk and are **lost on Render redeploy/restart**.

### 2.2 Render persistent disk vs free tier

Per [Render free tier docs](https://render.com/docs/free):

- **Free web services cannot attach persistent disks.**
- Filesystem is **ephemeral** (lost on deploy/restart).

Per [Render persistent disks](https://render.com/docs/disks):

- Disks require a **paid** web service, private service, or background worker.

**Implication for this project:** You cannot use Render disk storage on the **free** API service without paying to upgrade that service. Documenting and prepping settings is still useful for a future paid upgrade; it does not help the current free deployment.

### 2.3 Severity

| Context | Severity |
|---------|----------|
| **Final demo / closeout (current UI)** | **Low** — no upload-dependent flows |
| **Django admin uploads during demo** | **Medium** — images may appear until next deploy, then break |
| **Real production with signatures/photos** | **Critical** — data loss + broken URLs |

### 2.4 Decision for closeout

**Do not implement storage changes now** (per investigation: uploads not required for demo).

**Must fix before real production use** when any of the following are required:

- WO/discrepancy signature **image** files
- Aircraft photo gallery uploads from the app
- Profile avatars or mechanic certificate images in the SPA
- Any compliance workflow depending on retained files

### 2.5 Recommended fix (when you can pay for Render or use storage)

**Option A — Render persistent disk (simplest on Render, paid web service only)**

1. Upgrade the **backend web service** to a paid instance type.
2. In Render Dashboard → service → **Disks** → Add disk:
   - **Mount path:** `/var/data` (Render convention; only paths under the mount persist)
   - **Size:** smallest sufficient (e.g. 1–5 GB for demo)
3. Set backend environment variable:
   - `MEDIA_ROOT=/var/data/media`
4. In Django `settings.py` (future change):
   - `MEDIA_URL = '/media/'`
   - `MEDIA_ROOT = env('MEDIA_ROOT', default=str(BASE_DIR / 'media'))`
5. Serve media in production via a dedicated view or reverse proxy (WhiteNoise is for static assets, not user uploads).
6. Redeploy; upload via admin or API and restart service — file should still exist.

**Option B — Object storage (S3/R2)** — deferred; best for multi-instance production.

### 2.6 Files involved (when implemented later)

| File | Purpose |
|------|---------|
| `backend/config/settings.py` | `MEDIA_ROOT`, `MEDIA_URL` |
| `backend/config/urls.py` | Dev-only or controlled media URL pattern |
| `backend/.env.example` | Document `MEDIA_ROOT` |
| `docs/deployment/DEPLOYMENT.md` | Disk mount + env instructions |

### 2.7 Manual test steps (demo verification — no upload)

1. Log in as **mechanic** → **Maintenance** → open a work order → **Close / sign off** with notes.
2. Confirm sign-off shows **name + date** (not an image).
3. Log in as **pilot** → report a discrepancy (text only) → confirm saved.
4. Open **Fleet** → aircraft detail → confirm no “upload photo” control (photos empty or from seed only).
5. Open **Account** → edit name/phone → save → confirm no avatar upload.
6. (Optional) Django admin → attach `profile_img` → view in admin → redeploy API on Render → confirm image **404 or missing** (expected on free tier).

### 2.8 Manual test steps (after paid disk + settings — future)

1. Complete disk setup and `MEDIA_ROOT=/var/data/media`.
2. Upload `profile_img` in admin for a test user.
3. Note file exists under mount path (if shell access available) or via signed URL once serving is configured.
4. Trigger **Manual Deploy** on Render.
5. Reload image URL → **must still load**.

---

## 3. Environment variables (deployment readiness)

**Resolved (documentation):** `backend/.env.example`, `frontend/.env.example`, and [DEPLOYMENT.md](../deployment/DEPLOYMENT.md) (variable reference + **Deployment readiness checklist**) are aligned with code.

Use the canonical checklist: [DEPLOYMENT.md § Deployment readiness checklist](../deployment/DEPLOYMENT.md#deployment-readiness-checklist).

---

## 4. Deployment smoke (investigation)

| Check | Result |
|-------|--------|
| `yarn build` (frontend) | Passes (lint warnings only) |
| `manage.py check --deploy` | Warnings for local dev (`DEBUG`, HSTS, etc.) |
| Migrations | Include `token_blacklist` after JWT fix |
| Static (WhiteNoise) | OK for Django admin CSS/JS |
| Media | Not configured; not needed for current demo |

---

## 5. Prioritized issue list (closeout)

### Critical (must fix before production with uploads)

| ID | Issue | Fix |
|----|-------|-----|
| M-1 | No durable media on Render free tier | Paid disk + `MEDIA_ROOT` + media serving, or S3 |
| M-2 | No `/media/` URL routing | Add URL config + serving strategy when M-1 done |

### High

| ID | Issue | Fix |
|----|-------|-----|
| E-1 | `.env.example` missing prod vars | **Resolved** — see `backend/.env.example`, `DEPLOYMENT.md` |
| J-2 | Custom `token_refresh` ignores rotation/blacklist on refresh | Use SimpleJWT `TokenRefreshView` (post-closeout) |

### Medium

| ID | Issue | Fix |
|----|-------|-----|
| U-1 | `AddWorkOrderForm` / `AddDiscrepancyForm` stub file upload | Remove or wire post-MVP |
| D-1 | Admin-uploaded images break after deploy | Expected until M-1 |

### Low (demo OK)

| ID | Issue |
|----|-------|
| L-1 | `LandingPage` not routed |
| L-2 | Legacy `/tools` redirect |

### Resolved

| ID | Issue |
|----|-------|
| J-1 | JWT logout blacklist — **fixed** |

---

## 6. Production readiness confidence

| Scenario | Confidence |
|----------|------------|
| Client demo (current React flows, free Render) | **~75–80%** |
| Production with file retention | **~40%** until M-1/M-2 |
| Auth/session revocation after JWT fix | **~85%** after migrate on prod |

---

## 7. Sign-off recommendation

**Approve closeout** for demonstration of:

- Auth, RBAC, maintenance, work orders, fleet, parts, flights, analytics, search, component/service history (as implemented).

**Explicit non-goals for this release:**

- Persistent user-uploaded images on Render free tier
- File attachments on WO/discrepancy forms in the SPA

**Before billing production customers:**

1. Upgrade Render web service (or add object storage)
2. Implement media settings + serving
3. Re-run §2.8 manual tests
