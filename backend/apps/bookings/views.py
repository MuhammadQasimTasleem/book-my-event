from django.db.models import Prefetch
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsClient, IsOrganizer
from .models import Booking, ClientEvent
from .permissions import IsBookingOwnerOrOrganizer
from .serializers import BookingSerializer, ClientEventSerializer
from .services import notify_client_booking_status, notify_organizer_new_booking


class ClientEventViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ClientEventSerializer
    permission_classes = [IsAuthenticated, IsClient]

    def get_queryset(self):
        return (
            ClientEvent.objects.filter(client=self.request.user)
            .prefetch_related(
                Prefetch(
                    "bookings",
                    queryset=Booking.objects.select_related(
                        "service", "package", "organizer"
                    ).order_by("created_at"),
                )
            )
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("booking_status", "service", "organizer", "client")
    ordering = ("-created_at",)

    def get_queryset(self):
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return Booking.objects.all()
        if user.role == user.Role.ORGANIZER:
            return Booking.objects.filter(organizer=user)
        return Booking.objects.filter(client=user)

    def get_permissions(self):
        if self.action in ["create"]:
            return [IsAuthenticated(), IsClient()]
        if self.action in ["accept", "reject"]:
            return [IsAuthenticated(), IsOrganizer()]
        return [IsAuthenticated(), IsBookingOwnerOrOrganizer()]

    def perform_create(self, serializer):
        booking = serializer.save()
        notify_organizer_new_booking(booking)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsOrganizer])
    def accept(self, request, pk=None):
        booking = self.get_object()
        if booking.organizer_id != request.user.id:
            return Response({"message": "Not allowed."}, status=403)
        booking.booking_status = Booking.Status.ACCEPTED
        booking.save(update_fields=["booking_status"])
        notify_client_booking_status(booking)
        return Response({"message": "Booking accepted."})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsOrganizer])
    def reject(self, request, pk=None):
        booking = self.get_object()
        if booking.organizer_id != request.user.id:
            return Response({"message": "Not allowed."}, status=403)
        booking.booking_status = Booking.Status.REJECTED
        booking.save(update_fields=["booking_status"])
        notify_client_booking_status(booking)
        return Response({"message": "Booking rejected."})
