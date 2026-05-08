from rest_framework import serializers

from apps.organizers.models import OrganizerProfile
from .models import Service, ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ("id", "name", "is_active")


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = (
            "id",
            "organizer",
            "title",
            "description",
            "category",
            "tier",
            "price",
            "location",
            "rating",
            "availability",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("organizer", "rating")

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user:
            profile = getattr(request.user, "organizer_profile", None)
            if not profile or not profile.is_approved:
                raise serializers.ValidationError("Organizer is not approved.")
        return attrs
