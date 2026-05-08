from django.conf import settings
from django.utils import timezone

from common.emails import send_email
from common.utils import get_admin_emails
from .models import OrganizerProfile


def notify_admin_for_approval(profile: OrganizerProfile) -> None:
    subject = "Organizer approval request"
    body = f"Organizer {profile.company_name} requested approval."
    send_email(subject, body, get_admin_emails())


def approve_organizer(profile: OrganizerProfile, admin_user) -> OrganizerProfile:
    profile.approval_status = OrganizerProfile.Status.APPROVED
    profile.approved_by = admin_user
    profile.approved_at = timezone.now()
    profile.approval_notes = ""
    profile.save(update_fields=["approval_status", "approved_by", "approved_at", "approval_notes"])
    send_email(
        "Organizer approved",
        "Your organizer profile has been approved.",
        [profile.user.email],
    )
    return profile


def reject_organizer(profile: OrganizerProfile, admin_user, reason: str) -> OrganizerProfile:
    profile.approval_status = OrganizerProfile.Status.REJECTED
    profile.approved_by = admin_user
    profile.approved_at = timezone.now()
    profile.approval_notes = reason
    profile.save(update_fields=["approval_status", "approved_by", "approved_at", "approval_notes"])
    send_email(
        "Organizer rejected",
        f"Your organizer profile was rejected. Reason: {reason}",
        [profile.user.email],
    )
    return profile
