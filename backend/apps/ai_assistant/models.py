from django.db import models

from common.models import BaseModel


class AssistantLog(BaseModel):
    user_id = models.IntegerField(null=True, blank=True)
    prompt = models.TextField()
    response = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"AssistantLog {self.id}"
