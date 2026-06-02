"""Unit tests for csv_response helpers."""

from decimal import Decimal

from api.csv_response import csv_cell


def test_csv_cell_blank_for_none():
    assert csv_cell(None) == ""


def test_csv_cell_formats_decimal_without_em_dash():
    assert csv_cell(Decimal("120.00")) == "120"
    assert csv_cell(Decimal("0.50")) == "0.5"
