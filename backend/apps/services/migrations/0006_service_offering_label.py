# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0005_service_event_service_type_optional_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="offering_label",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Optional name when listing the same service type more than once (e.g. Buffet vs plated).",
                max_length=120,
            ),
        ),
    ]
