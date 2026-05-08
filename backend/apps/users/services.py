from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from common.emails import send_email
from .models import EmailVerificationToken, PasswordResetToken

User = get_user_model()


def send_verification_email(user, request=None) -> None:
    token = EmailVerificationToken.create_for_user(user)
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
    if request:
        verify_url = f"{settings.SITE_URL}/api/auth/verify-email/?token={token.token}"
    subject = "Verify your email"
    body = f"Please verify your account: {verify_url}"
    send_email(subject, body, [user.email])


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
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token.token}"
    subject = "Reset your password"
    body = f"Reset your password using this link: {reset_url}"
    send_email(subject, body, [user.email])


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
