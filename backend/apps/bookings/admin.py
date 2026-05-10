from django.contrib import admin

from .models import Booking


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
