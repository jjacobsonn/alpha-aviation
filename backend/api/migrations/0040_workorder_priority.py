from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0039_maintenance_activity_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="workorder",
            name="priority",
            field=models.CharField(
                choices=[
                    ("low", "Low"),
                    ("medium", "Medium"),
                    ("high", "High"),
                    ("critical", "Critical"),
                ],
                default="medium",
                max_length=20,
            ),
        ),
    ]
