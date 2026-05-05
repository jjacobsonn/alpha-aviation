# Superuser + Admin (staff) accounts

This project has **two layers** of authorization:

- **Platform / Site admin** (global): controlled by Django’s built-in flags:
  - `is_superuser` (highest authority)
  - `is_staff` (admin)
- **Company roles** (tenant feature access): `owner`, `manager`, `mechanic`, `pilot`, `dispatcher`

The frontend treats **platform admins** as having access to the global admin workspace (`/site-admin`) and to inspect role pages.

## Policy: only one superuser

Alpha Aviation enforces **exactly one** Django superuser account.

- If you try to create a second superuser, the backend will reject it.
- If you need to transfer superuser ownership, **demote** the old superuser first, then promote the new one.

## Create the one superuser

From `backend/`:

```bash
poetry run python manage.py createsuperuser
```

Follow the prompts (username/email/password).

## Promote an existing account to Admin (staff)

Admins are `is_staff=True` and `is_superuser=False`.

After promoting admins, run the bootstrap command below so they can use Django admin.

From `backend/`:

```bash
poetry run python manage.py shell
```

Then:

```python
from api.models import Profile

u = Profile.objects.get(username="some_username")
u.is_staff = True
u.is_superuser = False
u.save()
```

## Demote an account (remove admin access)

From the Django shell:

```python
from api.models import Profile

u = Profile.objects.get(username="some_username")
u.is_staff = False
u.is_superuser = False
u.save()
```

## Transfer superuser (only one allowed)

1) Demote the current superuser:

```python
from api.models import Profile

old = Profile.objects.get(username="CURRENT_SUPERUSER_USERNAME")
old.is_superuser = False
old.is_staff = True  # optional: keep them as an admin
old.save()
```

2) Promote the new superuser:

```python
new = Profile.objects.get(username="NEW_SUPERUSER_USERNAME")
new.is_staff = True
new.is_superuser = True
new.save()
```

## How the Site Admin “Role” is displayed

The Site Admin Users table shows a single **Role** value:

- `superuser` if `is_superuser=True`
- `admin` if `is_staff=True` (and not superuser)
- otherwise the user’s `company_role`

## Django admin permissions for admins (staff)

Django’s `/admin/` requires **both**:
- `is_staff=True`
- permissions to view/change models (unless you are a superuser)

To make staff admins able to view/edit everything in Django admin, run:

```bash
cd backend
poetry run python manage.py bootstrap_site_admins
```

This creates/updates a `site_admin` group and assigns it to all staff (non-superuser) users.

