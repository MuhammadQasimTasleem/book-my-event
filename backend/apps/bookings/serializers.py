from django.utils import timezone
from rest_framework import serializers

from apps.packages.models import EventPackage
from apps.services.models import Service
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    service_title = serializers.SerializerMethodField()
    organizer_display = serializers.SerializerMethodField()
    client_display = serializers.SerializerMethodField()
    package_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "client",
            "client_display",
            "organizer",
            "organizer_display",
            "service",
            "service_title",
            "package",
            "package_name",
            "event_date",
            "event_time",
            "guest_count",
            "event_type",
            "price_breakdown",
            "total_estimate",
            "booking_status",
            "payment_status",
            "notes",
            "organizer_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "client",
            "organizer",
            "booking_status",
            "payment_status",
            "service_title",
            "organizer_display",
            "client_display",
            "package_name",
        )

    def get_service_title(self, obj):
        return obj.service.listing_title() if obj.service_id else None

    def get_package_name(self, obj):
        return obj.package.name if obj.package_id else None

    def get_organizer_display(self, obj):
        u = obj.organizer
        return (f"{u.first_name} {u.last_name}".strip()) or u.email

    def get_client_display(self, obj):
        u = obj.client
        return (f"{u.first_name} {u.last_name}".strip()) or u.email

    def validate_event_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Event date must be in the future.")
        return value

    def validate_price_breakdown(self, value):
        if value in (None, []):
            return value or []
        if not isinstance(value, list):
            raise serializers.ValidationError("price_breakdown must be a list.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        if "organizer_notes" in attrs:
            if not self.instance:
                attrs.pop("organizer_notes", None)
            elif user:
                allowed = user.role == user.Role.ADMIN or (
                    user.role == user.Role.ORGANIZER
                    and user.id == self.instance.organizer_id
                )
                if not allowed:
                    raise serializers.ValidationError(
                        {
                            "organizer_notes": "Only the organizer for this booking can update this."
                        }
                    )

        if self.instance:
            service = attrs.get("service", self.instance.service)
            package = attrs.get("package", self.instance.package)
        else:
            service = attrs.get("service")
            package = attrs.get("package")
        if not service and not package:
            raise serializers.ValidationError("Provide a service or a package.")
        return attrs

    def create(self, validated_data):
        validated_data.pop("organizer_notes", None)
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
