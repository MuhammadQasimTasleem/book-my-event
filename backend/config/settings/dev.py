from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]


def _smtp_credentials_ready() -> bool:
    """Use real SMTP when .env has non-placeholder credentials; else log mail to the runserver console."""
    u = (EMAIL_HOST_USER or "").strip()
    p = (EMAIL_HOST_PASSWORD or "").strip()
    if not u or not p:
        return False
    combined = f"{u.lower()}{p.lower()}"
    for bad in ("your-email", "your-app-password", "changeme"):
        if bad in combined:
            return False
    return True


_force_smtp = config("FORCE_SMTP", default=False, cast=bool)

# Set EMAIL_BACKEND in .env to force a backend (e.g. smtp) regardless of auto-detect.
_explicit = config("EMAIL_BACKEND", default="").strip()
if _explicit:
    EMAIL_BACKEND = _explicit
else:
    EMAIL_BACKEND = (
        "django.core.mail.backends.smtp.EmailBackend"
        if _force_smtp or _smtp_credentials_ready()
        else "django.core.mail.backends.console.EmailBackend"
    )
