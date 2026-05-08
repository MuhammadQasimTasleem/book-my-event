from django.conf import settings
from django.db import models

from common.models import BaseModel


class Review(BaseModel):
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_written"
    )
    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_received"
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    is_visible = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.reviewer_id} -> {self.reviewee_id}"
