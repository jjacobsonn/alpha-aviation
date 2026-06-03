# Backend

Django 5 + Django REST Framework API for Alpha Aviation. Poetry manages Python dependencies.

## Layout

| Path | Purpose |
|------|---------|
| `api/` | Models, serializers, views, permissions, migrations |
| `api/management/commands/` | Custom management commands (`seed`, demo bootstraps) |
| `api/testing/` | Pytest suite |
| `config/` | Django settings and URL routing |
| `bin/` | Server start script |

## Commands

```bash
poetry install
poetry run python manage.py runserver
poetry run python manage.py migrate
poetry run python manage.py test
python -m pytest api/testing -q
```

## Documentation

| Topic | Doc |
|-------|-----|
| Local setup | [docs/setup/DEVELOPMENT.md](../docs/setup/DEVELOPMENT.md) |
| API reference | [docs/architecture/APIContract.md](../docs/architecture/APIContract.md) |
| Models | [docs/architecture/models_documentation.md](../docs/architecture/models_documentation.md) |
| Seed command | [docs/operations/seed_db.md](../docs/operations/seed_db.md) |
| Backend tests | [docs/testing/backend/README.md](../docs/testing/backend/README.md) |
| Full index | [docs/README.md](../docs/README.md) |
