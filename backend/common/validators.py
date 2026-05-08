import re
from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$")
USERNAME_REGEX = re.compile(r"^[A-Za-z0-9_]+$")
PK_PHONE_REGEX = re.compile(r"^(\+92|0)?3\d{9}$")


def validate_email_unique(value: str) -> None:
    User = apps.get_model("users", "User")
    validate_email(value)
    if User.objects.filter(email__iexact=value).exists():
        raise ValidationError("Email already exists.")


def validate_password_strength(value: str) -> None:
    if len(value) < 8:
        raise ValidationError("Password must be at least 8 characters.")
    if not PASSWORD_REGEX.match(value):
        raise ValidationError(
            "Password must contain uppercase, lowercase, number, and special character."
        )


def validate_phone_pk(value: str) -> None:
    if value and not PK_PHONE_REGEX.match(value):
        raise ValidationError("Invalid Pakistani phone number format.")


def validate_username(value: str) -> None:
    User = apps.get_model("users", "User")
    if not USERNAME_REGEX.match(value):
        raise ValidationError("Username can contain letters, numbers, and underscore only.")
    if User.objects.filter(username__iexact=value).exists():
        raise ValidationError("Username already exists.")
