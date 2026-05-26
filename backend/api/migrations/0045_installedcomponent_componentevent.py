# Generated manually for Phase 2 — 3.3.2 Component History

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0044_add_must_change_password"),
    ]

    operations = [
        migrations.CreateModel(
            name="InstalledComponent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("part_number", models.CharField(max_length=200)),
                ("part_name", models.CharField(blank=True, default="", max_length=200)),
                ("serial_number", models.CharField(blank=True, default="", max_length=200)),
                (
                    "component_type",
                    models.CharField(
                        choices=[
                            ("serialized", "Serialized"),
                            ("consumable", "Consumable"),
                        ],
                        default="serialized",
                        max_length=16,
                    ),
                ),
                ("location", models.CharField(blank=True, default="", max_length=200)),
                (
                    "limit_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("hours", "Hours"),
                            ("cycles", "Cycles"),
                            ("calendar", "Calendar"),
                        ],
                        default="",
                        max_length=16,
                    ),
                ),
                (
                    "limit_value",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                (
                    "used_value",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        default=0,
                        max_digits=12,
                        null=True,
                    ),
                ),
                ("limit_due_date", models.DateField(blank=True, null=True)),
                ("installed_at", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="")),
                (
                    "aircraft",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="installed_components",
                        to="api.aircraft",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="installed_components",
                        to="api.company",
                    ),
                ),
                (
                    "part",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="installed_components",
                        to="api.part",
                    ),
                ),
            ],
            options={
                "ordering": ["part_number", "serial_number"],
            },
        ),
        migrations.CreateModel(
            name="ComponentEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("install", "Install"),
                            ("removal", "Removal"),
                            ("inspection", "Inspection"),
                            ("work_order", "Work Order"),
                            ("note", "Note"),
                        ],
                        max_length=32,
                    ),
                ),
                ("occurred_at", models.DateTimeField()),
                ("summary", models.TextField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="component_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "aircraft",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="api.aircraft",
                    ),
                ),
                (
                    "component",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="api.installedcomponent",
                    ),
                ),
                (
                    "work_order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="api.workorder",
                    ),
                ),
            ],
            options={
                "ordering": ["-occurred_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="installedcomponent",
            constraint=models.UniqueConstraint(
                fields=("company", "part_number", "serial_number"),
                name="unique_installed_component_company_pn_sn",
            ),
        ),
    ]
