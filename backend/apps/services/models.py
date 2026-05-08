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
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(
        ServiceCategory, on_delete=models.PROTECT, related_name="services"
    )
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.NORMAL)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    location = models.CharField(max_length=120)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    availability = models.BooleanField(default=True)
    images = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:
        return self.title
