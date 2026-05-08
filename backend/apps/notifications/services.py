from .models import Notification


def create_notification(user, title: str, message: str) -> Notification:
    return Notification.objects.create(user=user, title=title, message=message)
