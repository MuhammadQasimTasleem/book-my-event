from .models import Message


def send_message(sender, receiver, content: str) -> Message:
    return Message.objects.create(sender=sender, receiver=receiver, content=content)
