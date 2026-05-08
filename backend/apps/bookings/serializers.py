from django.utils import timezone
from rest_framework import serializers

from apps.packages.models import EventPackage
from apps.services.models import Service
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = (
            "id",
            "client",
            "organizer",
            "service",
            "package",
            "event_date",
            "booking_status",
            "payment_status",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("client", "organizer", "booking_status", "payment_status")

    def validate_event_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Event date must be in the future.")
        return value

    def validate(self, attrs):
        service = attrs.get("service")
        package = attrs.get("package")
        if not service and not package:
            raise serializers.ValidationError("Provide a service or a package.")
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        client = request.user
        service = validated_data.get("service")
        package = validated_data.get("package")

        organizer = None
        if service:
            organizer = service.organizer
            exists = Booking.objects.filter(
                client=client,
                service=service,
                event_date=validated_data["event_date"],
            ).exists()
            if exists:
                raise serializers.ValidationError("Duplicate booking for this service/date.")
        elif package:
            service_ids = list(
                package.items.exclude(service=None).values_list("service_id", flat=True)
            )
            if not service_ids:
                raise serializers.ValidationError("Package has no services to book.")
            organizers = set(
                Service.objects.filter(id__in=service_ids).values_list("organizer_id", flat=True)
            )
            if len(organizers) != 1:
                raise serializers.ValidationError("Package items must belong to one organizer.")
            organizer = Service.objects.get(id=service_ids[0]).organizer

        booking = Booking.objects.create(
            client=client,
            organizer=organizer,
            **validated_data,
        )
        return booking
