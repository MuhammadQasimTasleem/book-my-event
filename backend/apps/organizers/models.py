from django.conf import settings
from django.db import models

from common.models import BaseModel


class OrganizerProfile(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organizer_profile",
    )
    company_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    approval_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    approval_notes = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_organizers",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_approved(self) -> bool:
        return self.approval_status == self.Status.APPROVED

    def __str__(self):
        return f"{self.company_name} ({self.approval_status})"


class OrganizerEventPhoto(BaseModel):
    """Portfolio / past event images uploaded by the organizer (shown on public profile)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_photos",
    )
    image = models.ImageField(upload_to="organizer_events/%Y/%m/")
    caption = models.CharField(max_length=500, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"Event photo {self.pk} ({self.user_id})"
