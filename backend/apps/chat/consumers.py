import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

from .models import Message
from .serializers import MessageSerializer
from .services import can_exchange_organizer_client_messages

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not getattr(user, "is_authenticated", False):
            await self.close()
            return
        self.group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        user = self.scope["user"]
        if not getattr(user, "is_authenticated", False):
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        receiver_id = data.get("receiver")
        content = (data.get("content") or "").strip()
        if receiver_id is None or not content:
            return
        msg = await self._create_message(user.id, int(receiver_id), content)
        if not msg:
            return
        payload = await self._serialize(msg)
        event = {"type": "chat.message", "message": payload}
        for uid in (msg.sender_id, msg.receiver_id):
            await self.channel_layer.group_send(f"user_{uid}", event)

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps({"type": "message", "message": event["message"]})
        )

    async def chat_read_receipt(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "read_receipt",
                    "reader_id": event["reader_id"],
                    "message_ids": event["message_ids"],
                }
            )
        )

    @database_sync_to_async
    def _create_message(self, sender_id, receiver_id, content):
        if sender_id == receiver_id:
            return None
        try:
            sender = User.objects.get(pk=sender_id)
            receiver = User.objects.get(pk=receiver_id)
        except User.DoesNotExist:
            return None
        if not can_exchange_organizer_client_messages(sender, receiver):
            return None
        return Message.objects.create(
            sender_id=sender_id, receiver_id=receiver_id, content=content
        )

    @database_sync_to_async
    def _serialize(self, msg):
        # No request in WS scope — absolute image URLs omitted; client uses relative or refetch.
        return MessageSerializer(msg).data
