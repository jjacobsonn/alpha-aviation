from .settings import *

# Use SQLite for pytest so tests do not require PostgreSQL CREATEDB privileges.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}
