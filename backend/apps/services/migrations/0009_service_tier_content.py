from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0008_alter_service_event_type_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="tier_details",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="service",
            name="tier_images",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
