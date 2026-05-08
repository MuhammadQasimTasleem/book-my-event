from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model


def generate_token() -> str:
    return uuid4().hex


def get_admin_emails() -> list[str]:
    User = get_user_model()
    emails = list(
        User.objects.filter(role=User.Role.ADMIN, is_active=True).values_list(
            "email", flat=True
        )
    )
    return emails or [settings.ADMIN_NOTIFY_EMAIL]
