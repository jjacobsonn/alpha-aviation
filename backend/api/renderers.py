"""DRF renderers used for file downloads (CSV, etc.)."""

from rest_framework.renderers import BaseRenderer


class CSVRenderer(BaseRenderer):
    """
    Accept Accept: text/csv so DRF content negotiation does not return 406.
    Views should return django.http.HttpResponse with CSV body.
    """

    media_type = "text/csv"
    format = "csv"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if isinstance(data, (bytes, str)):
            return data
        if hasattr(data, "content"):
            return data.content
        return data
