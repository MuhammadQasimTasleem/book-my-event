from rest_framework import serializers

from .models import AssistantLog


class AssistantLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantLog
        fields = ("id", "user_id", "prompt", "response", "created_at")
