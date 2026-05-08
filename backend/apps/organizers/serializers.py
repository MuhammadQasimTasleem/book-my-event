from rest_framework import serializers

from .models import OrganizerProfile


class OrganizerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerProfile
        fields = (
            "id",
            "user",
            "company_name",
            "description",
            "approval_status",
            "approval_notes",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("approval_status", "approval_notes", "approved_by", "approved_at")
