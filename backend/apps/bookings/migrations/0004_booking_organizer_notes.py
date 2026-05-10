from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0003_booking_event_details"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="organizer_notes",
            field=models.TextField(
                blank=True,
                help_text="Message from organizer to the client (visible on the booking).",
            ),
        ),
    ]
