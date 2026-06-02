"""Helpers for CSV file download responses."""

import re

from django.http import HttpResponse


def safe_csv_filename_part(value):
    text = str(value or "").strip()
    if not text:
        return ""
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", text)
    return cleaned.strip("-.")


def csv_attachment_response(csv_text, filename):
    """Return HttpResponse configured for browser CSV download."""
    safe_name = safe_csv_filename_part(filename.replace(".csv", "")) or "export"
    if not safe_name.endswith(".csv"):
        safe_name = f"{safe_name}.csv"
    response = HttpResponse(csv_text, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{safe_name}"'
    return response
