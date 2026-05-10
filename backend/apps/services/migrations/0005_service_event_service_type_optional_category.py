# Generated manually

import django.db.models.deletion
from django.db import migrations, models


def backfill_service_fields(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    ServiceCategory = apps.get_model("services", "ServiceCategory")
    for s in Service.objects.all().iterator():
        ev = (getattr(s, "event_type", None) or "").strip()
        if not ev:
            raw = getattr(s, "event_types", None) or []
            if isinstance(raw, list) and raw:
                ev = str(raw[0]).strip()
        if not ev:
            ev = "General"

        st = (getattr(s, "service_type", None) or "").strip()
        if not st and s.category_id:
            try:
                c = ServiceCategory.objects.get(pk=s.category_id)
                st = (c.name or "").strip()
            except ServiceCategory.DoesNotExist:
                st = ""
        if not st:
            st = "Service"

        title = (s.title or "").strip()
        if not title:
            title = f"{st} · {ev}"[:200]

        Service.objects.filter(pk=s.pk).update(
            event_type=ev,
            service_type=st,
            title=title,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0004_service_event_types"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="event_type",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Kind of event this offering is for (e.g. Wedding, or custom text).",
                max_length=120,
            ),
        ),
        migrations.AddField(
            model_name="service",
            name="service_type",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Kind of service (e.g. Catering, or custom text).",
                max_length=120,
            ),
        ),
        migrations.AlterField(
            model_name="service",
            name="title",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AlterField(
            model_name="service",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="service",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="services",
                to="services.servicecategory",
            ),
        ),
        migrations.AlterField(
            model_name="service",
            name="pricing_unit",
            field=models.CharField(
                choices=[("per_event", "Per event"), ("per_guest", "Per guest")],
                default="per_guest",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_service_fields, migrations.RunPython.noop),
    ]
