from rest_framework import serializers

from apps.services.models import Service, ServiceCategory
from .models import EventPackage, PackageItem


class PackageItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackageItem
        fields = (
            "id",
            "package",
            "service",
            "category",
            "tier",
            "quantity",
            "notes",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        if not attrs.get("service") and not attrs.get("category"):
            raise serializers.ValidationError("Service or category is required.")
        return attrs


class EventPackageSerializer(serializers.ModelSerializer):
    items = PackageItemSerializer(many=True, read_only=True)

    class Meta:
        model = EventPackage
        fields = (
            "id",
            "client",
            "name",
            "event_type",
            "tier",
            "guest_count",
            "venue",
            "event_date",
            "notes",
            "status",
            "estimated_total",
            "estimated_min",
            "estimated_max",
            "breakdown",
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("client", "estimated_total", "estimated_min", "estimated_max", "breakdown")


class BudgetItemInputSerializer(serializers.Serializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), required=False)
    category = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.all(), required=False
    )
    tier = serializers.ChoiceField(choices=Service.Tier.choices)
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate(self, attrs):
        if not attrs.get("service") and not attrs.get("category"):
            raise serializers.ValidationError("Service or category is required.")
        return attrs


class BudgetEstimateRequestSerializer(serializers.Serializer):
    package_id = serializers.IntegerField(required=False)
    items = BudgetItemInputSerializer(many=True, required=False)

    def validate(self, attrs):
        if not attrs.get("package_id") and not attrs.get("items"):
            raise serializers.ValidationError("Provide package_id or items.")
        return attrs
