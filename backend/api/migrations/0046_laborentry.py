# Phase 2 — LaborEntry for accurate maintenance labor tracking

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0045_installedcomponent_componentevent"),
    ]

    operations = [
        migrations.CreateModel(
            name="LaborEntry",
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
                ("hours", models.DecimalField(decimal_places=2, max_digits=8)),
                ("work_date", models.DateField()),
                ("notes", models.CharField(blank=True, default="", max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="labor_entries_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "mechanic",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="labor_entries",
                        to="api.profile",
                    ),
                ),
                (
                    "work_order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="labor_entries",
                        to="api.workorder",
                    ),
                ),
            ],
            options={
                "ordering": ["-work_date", "-id"],
            },
        ),
    ]
