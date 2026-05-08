from common.emails import send_email

from .models import Booking


def notify_organizer_new_booking(booking: Booking) -> None:
    subject = "New booking request"
    body = f"You received a new booking request (ID: {booking.id})."
    send_email(subject, body, [booking.organizer.email])


def notify_client_booking_status(booking: Booking) -> None:
    subject = f"Booking {booking.booking_status}"
    body = f"Your booking status is now {booking.booking_status}."
    send_email(subject, body, [booking.client.email])
