# Generated manually — store comma-separated event types when many are selected.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0006_service_offering_label"),
    ]

    operations = [
        migrations.AlterField(
            model_name="service",
            name="event_type",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Summary of event kinds (often comma-separated); canonical list is event_types JSON.",
                max_length=500,
            ),
        ),
    ]
