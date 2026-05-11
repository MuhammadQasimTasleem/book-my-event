from django.contrib import admin

from .models import Booking, ClientEvent


@admin.register(ClientEvent)
class ClientEventAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "client", "created_at", "updated_at")
    search_fields = ("title", "client__email")
    list_filter = ("created_at",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client",
        "organizer",
        "booking_status",
        "event_date",
        "guest_count",
        "total_estimate",
    )
    list_filter = ("booking_status", "payment_status")
    search_fields = ("client__email", "organizer__email")
