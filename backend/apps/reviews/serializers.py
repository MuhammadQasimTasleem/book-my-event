from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = (
            "id",
            "reviewer",
            "reviewee",
            "rating",
            "comment",
            "is_visible",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("reviewer",)

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
