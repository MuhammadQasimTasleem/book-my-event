from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Message
from .permissions import IsMessageParticipant
from .serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsMessageParticipant]

    def get_queryset(self):
        user = self.request.user
        return (
            (Message.objects.filter(sender=user) | Message.objects.filter(receiver=user))
            .distinct()
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        msg = serializer.save(sender=self.request.user)
        layer = get_channel_layer()
        if layer:
            payload = MessageSerializer(msg).data
            for uid in (msg.sender_id, msg.receiver_id):
                async_to_sync(layer.group_send)(
                    f"user_{uid}",
                    {"type": "chat.push", "message": payload},
                )
