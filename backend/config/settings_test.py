from .settings import *


class DisableMigrations(dict):
    """Apply models directly in tests — avoids duplicate CreateModel in migration branches."""

    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()

# In-memory SQLite for pytest (no PostgreSQL / no stale files).
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
