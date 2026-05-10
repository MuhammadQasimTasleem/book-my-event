from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from common.emails import send_email
from .models import EmailVerificationToken, PasswordResetToken

User = get_user_model()


def send_verification_email(user, request=None) -> None:
    """Send link to the frontend verify-email page (FRONTEND_URL must match the Next.js origin)."""
    token = EmailVerificationToken.create_for_user(user)
    base = str(settings.FRONTEND_URL).rstrip("/")
    verify_url = f"{base}/verify-email?token={token.token}"
    subject = "Verify your Book My Event email"
    body = (
        "Thanks for signing up.\n\n"
        f"Open this link to verify your email (it expires after a while):\n{verify_url}\n\n"
        "If you did not create an account, you can ignore this message."
    )
    html = (
        "<p>Thanks for signing up.</p>"
        f'<p><a href="{verify_url}">Verify your email</a></p>'
        f"<p style=\"color:#666;font-size:12px\">Or copy this URL:<br>{verify_url}</p>"
    )
    send_email(subject, body, [user.email], html_body=html)


def verify_email_token(token: str) -> User:
    verification = EmailVerificationToken.objects.select_related("user").get(token=token)
    if verification.used or verification.is_expired():
        raise ValueError("Token expired or already used.")
    verification.used = True
    verification.save(update_fields=["used"])
    verification.user.is_verified = True
    verification.user.save(update_fields=["is_verified"])
    return verification.user


def send_password_reset_email(user) -> None:
    token = PasswordResetToken.create_for_user(user)
    base = str(settings.FRONTEND_URL).rstrip("/")
    reset_url = f"{base}/reset-password?token={token.token}"
    subject = "Reset your Book My Event password"
    body = f"Use this link to set a new password:\n{reset_url}\n\nIf you did not request this, ignore this email."
    html = f'<p><a href="{reset_url}">Reset your password</a></p>'
    send_email(subject, body, [user.email], html_body=html)


def reset_password(token: str, new_password: str) -> None:
    reset = PasswordResetToken.objects.select_related("user").get(token=token)
    if reset.used or reset.is_expired():
        raise ValueError("Token expired or already used.")
    reset.user.set_password(new_password)
    reset.user.save(update_fields=["password"])
    reset.used = True
    reset.save(update_fields=["used"])


def request_password_reset(email: str) -> None:
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return
    send_password_reset_email(user)


def resend_verification_email(email: str) -> bool:
    """Send a new verification link if the account exists and is not yet verified."""
    user = User.objects.filter(email__iexact=(email or "").strip()).first()
    if not user or user.is_verified:
        return False
    send_verification_email(user)
    return True
