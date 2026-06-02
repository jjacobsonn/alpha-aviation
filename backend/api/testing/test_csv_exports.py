"""
Regression tests for server-side CSV export endpoints.

When adding a new CSV export URL, register it in CSV_EXPORT_ENDPOINTS and add
@renderer_classes([CSVRenderer]) on the view.
"""

import pytest
from django.urls import reverse
from rest_framework import status

from api.renderers import CSVRenderer

# (url_name, kwargs_factory) — keep in sync with api/urls.py
CSV_EXPORT_ENDPOINTS = [
    ("component-history-export", lambda fixture: {"pk": fixture.id}),
]


@pytest.mark.django_db
class TestCsvExportEndpoints:
    @pytest.mark.parametrize("url_name,kwargs_fn", CSV_EXPORT_ENDPOINTS)
    def test_csv_export_accepts_text_csv(
        self, authenticated_client, sample_installed_component, url_name, kwargs_fn
    ):
        kwargs = kwargs_fn(sample_installed_component)
        url = reverse(url_name, kwargs=kwargs)
        for accept in ("text/csv", "text/csv, application/json", "*/*"):
            response = authenticated_client.get(url, HTTP_ACCEPT=accept)
            assert response.status_code == status.HTTP_200_OK, accept
            assert "text/csv" in response["Content-Type"]
            assert b"," in response.content or response.content

    def test_csv_renderer_registered_on_export_view(self):
        from api.component_history_views import component_history_export

        renderer_classes = getattr(
            getattr(component_history_export, "cls", None),
            "renderer_classes",
            [],
        )
        renderer_types = [type(r) for r in renderer_classes]
        assert CSVRenderer in renderer_types
