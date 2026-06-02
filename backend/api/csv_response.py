"""Helpers for CSV file download responses."""

import re
from decimal import Decimal

from django.http import HttpResponse


def csv_cell(value):
    """
    Format a value for CSV output.
    Uses blank for missing data (never Unicode dashes) so Excel on Windows/Mac
    does not show mojibake when the file is opened without UTF-8 detection.
    """
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return format(value, "f").rstrip("0").rstrip(".") or "0"
    if isinstance(value, float):
        text = format(value, "g")
        return text if text != "-0" else "0"
    text = str(value).strip()
    return text


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
    # BOM helps Excel detect UTF-8 for real Unicode in location names, etc.
    body = csv_text if csv_text.startswith("\ufeff") else f"\ufeff{csv_text}"
    response = HttpResponse(body.encode("utf-8"), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{safe_name}"'
    return response
