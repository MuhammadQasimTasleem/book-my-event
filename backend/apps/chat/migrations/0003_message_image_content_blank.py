from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="message",
            name="content",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="message",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to="chat/%Y/%m/"),
        ),
    ]
