from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.packages.models import EventPackage
from apps.services.models import Service
from common.models import BaseModel


class ClientEvent(BaseModel):
    """Groups multiple booking requests (e.g. multi-organizer plan) under one client-facing event."""

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_events",
    )
    title = models.CharField(max_length=200)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"{self.title} ({self.client_id})"


class Booking(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        COMPLETED = "completed", "Completed"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PAID = "paid", "Paid"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings"
    )
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organizer_bookings",
    )
    service = models.ForeignKey(
        Service, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings"
    )
    package = models.ForeignKey(
        EventPackage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    client_event = models.ForeignKey(
        ClientEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    event_date = models.DateField()
    event_time = models.TimeField(null=True, blank=True)
    guest_count = models.PositiveIntegerField(default=1)
    event_type = models.CharField(max_length=200, blank=True)
    price_breakdown = models.JSONField(default=list, blank=True)
    total_estimate = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    booking_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID
    )
    notes = models.TextField(blank=True)
    organizer_notes = models.TextField(
        blank=True,
        help_text="Message from organizer to the client (visible on the booking).",
    )

    def clean(self):
        if not self.service and not self.package:
            raise ValidationError("Booking must include a service or a package.")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.client_event_id:
            ClientEvent.objects.filter(pk=self.client_event_id).update(
                updated_at=timezone.now()
            )

    def __str__(self) -> str:
        return f"Booking {self.id}"
