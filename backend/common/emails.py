from typing import Iterable, Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def send_email(
    subject: str, body: str, recipients: Iterable[str], html_body: Optional[str] = None
) -> None:
    message = EmailMultiAlternatives(subject, body, settings.DEFAULT_FROM_EMAIL, recipients)
    if html_body:
        message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)
