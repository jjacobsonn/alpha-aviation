# Same as ../Dockerfile.railway-api — use when config path is /backend/Dockerfile.
FROM python:3.12-slim-bookworm

WORKDIR /app

RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root

COPY . .

CMD sh -c "python manage.py collectstatic --noinput && python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --timeout 120 --workers 1"
