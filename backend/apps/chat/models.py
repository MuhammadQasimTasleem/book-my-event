from django.conf import settings
from django.db import models

from common.models import BaseModel


class Message(BaseModel):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_sent"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_received"
    )
    content = models.TextField(blank=True, default="")
    image = models.ImageField(upload_to="chat/%Y/%m/", blank=True, null=True)
    is_read = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"Message {self.id}"
