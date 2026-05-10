import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.notifications.models import Notification
from common.emails import send_email
from common.utils import get_admin_emails
from .models import OrganizerProfile

logger = logging.getLogger(__name__)

User = get_user_model()

MIN_ORGANIZER_DESCRIPTION_LEN = 20


def profile_ready_for_approval(profile: OrganizerProfile, user) -> tuple[bool, list[str]]:
    """Business rules: admin should not approve (and organizer should not submit) until these pass."""
    errs: list[str] = []
    if not (profile.company_name or "").strip():
        errs.append("Company name is required.")
    if len((profile.description or "").strip()) < MIN_ORGANIZER_DESCRIPTION_LEN:
        errs.append(
            f"Business description must be at least {MIN_ORGANIZER_DESCRIPTION_LEN} characters."
        )
    if not user.services.exists():
        errs.append("At least one service listing is required.")
    return len(errs) == 0, errs


def notify_admin_for_approval(profile: OrganizerProfile) -> None:
    title = "Organizer pending approval"
    message = (
        f"{profile.company_name} (user id {profile.user_id}) submitted for review. "
        f"Open the admin console to review their profile and services."
    )
    for admin in User.objects.filter(role=User.Role.ADMIN, is_active=True):
        Notification.objects.create(user=admin, title=title, message=message)

    subject = "Organizer approval request"
    body = (
        f"Organizer {profile.company_name} (user id {profile.user_id}) requested approval.\n"
        f"Review in the admin dashboard."
    )
    try:
        send_email(subject, body, get_admin_emails())
    except Exception:
        logger.exception("notify_admin_for_approval: email failed (in-app notification still sent)")


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
