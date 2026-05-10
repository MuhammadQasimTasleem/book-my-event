# Generated manually — aligns model with ServiceSerializer.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0003_service_pricing_portfolio"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="event_types",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
