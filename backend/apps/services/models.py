from django.conf import settings
from django.db import models

from common.models import BaseModel


class ServiceCategory(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class Service(BaseModel):
    class Tier(models.TextChoices):
        NORMAL = "normal", "Normal"
        MODERATE = "moderate", "Moderate"
        LUXURY = "luxury", "Luxury"

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="services"
    )
    # Auto-derived from service_type + event_type for listings; company story lives on OrganizerProfile.
    title = models.CharField(max_length=200, blank=True, default="")
    description = models.TextField(blank=True, default="")
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        related_name="services",
        null=True,
        blank=True,
    )
    event_type = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Comma-separated summary of event kinds; canonical list is event_types JSON.",
    )
    service_type = models.CharField(
        max_length=120,
        blank=True,
        default="",
        help_text="Kind of service (e.g. Catering, or custom text).",
    )
    offering_label = models.CharField(
        max_length=120,
        blank=True,
        default="",
        help_text="Optional label when the same service type is listed more than once (e.g. Pakistani buffet vs continental).",
    )
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.NORMAL)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    pricing_unit = models.CharField(
        max_length=20,
        choices=[("per_event", "Per event"), ("per_guest", "Per guest")],
        default="per_guest",
    )
    tier_prices = models.JSONField(default=dict, blank=True)
    tier_details = models.JSONField(default=dict, blank=True)
    tier_images = models.JSONField(default=dict, blank=True)
    included_amenities = models.JSONField(default=list, blank=True)
    event_types = models.JSONField(default=list, blank=True)
    location = models.CharField(max_length=120)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    availability = models.BooleanField(default=True)
    images = models.JSONField(default=list, blank=True)

    def _event_types_display(self) -> str:
        raw = getattr(self, "event_types", None) or []
        if isinstance(raw, list) and raw:
            parts = [str(x).strip() for x in raw if str(x).strip()]
            return ", ".join(parts)
        return (self.event_type or "").strip()

    def listing_title(self) -> str:
        label = (self.offering_label or "").strip()
        a = (self.service_type or "").strip()
        b = self._event_types_display()
        core = f"{a} · {b}" if a and b else (a or b or (self.title or "").strip())
        if label and core:
            return f"{label} — {core}"
        if label:
            return label
        return core or "Service"

    def __str__(self) -> str:
        return self.listing_title()
