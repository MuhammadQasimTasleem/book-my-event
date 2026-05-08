from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.services.models import Service, ServiceCategory
from common.models import BaseModel


class EventPackage(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="packages"
    )
    name = models.CharField(max_length=200)
    event_type = models.CharField(max_length=100)
    tier = models.CharField(max_length=20, choices=Service.Tier.choices)
    guest_count = models.PositiveIntegerField(default=0)
    venue = models.CharField(max_length=200, blank=True)
    event_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    estimated_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_min = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_max = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    breakdown = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return self.name


class PackageItem(BaseModel):
    package = models.ForeignKey(
        EventPackage, on_delete=models.CASCADE, related_name="items"
    )
    service = models.ForeignKey(
        Service, on_delete=models.SET_NULL, null=True, blank=True, related_name="package_items"
    )
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="package_items",
    )
    tier = models.CharField(max_length=20, choices=Service.Tier.choices)
    quantity = models.PositiveIntegerField(default=1)
    notes = models.CharField(max_length=200, blank=True)

    def clean(self):
        if not self.service and not self.category:
            raise ValidationError("Service or category is required for a package item.")

    def __str__(self) -> str:
        return f"{self.package.name} item"
