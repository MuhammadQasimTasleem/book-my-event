# Generated manually for booking form details + estimate snapshot

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="event_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="guest_count",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="booking",
            name="event_type",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="booking",
            name="price_breakdown",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="booking",
            name="total_estimate",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True
            ),
        ),
    ]
