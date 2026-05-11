"""Rules for who may message whom (organizer ↔ client only)."""

from django.contrib.auth import get_user_model

from apps.organizers.models import OrganizerProfile

User = get_user_model()


def user_is_approved_organizer(user_id: int) -> bool:
    return OrganizerProfile.objects.filter(
        user_id=user_id,
        approval_status=OrganizerProfile.Status.APPROVED,
    ).exists()


def can_exchange_organizer_client_messages(sender, receiver) -> bool:
    """True when one party is an approved organizer and the other is a client."""
    if not sender or not receiver or sender.pk == receiver.pk:
        return False
    s_role = getattr(sender, "role", None)
    r_role = getattr(receiver, "role", None)
    if s_role == User.Role.CLIENT and r_role == User.Role.ORGANIZER:
        return user_is_approved_organizer(receiver.pk)
    if s_role == User.Role.ORGANIZER and r_role == User.Role.CLIENT:
        return user_is_approved_organizer(sender.pk)
    return False
