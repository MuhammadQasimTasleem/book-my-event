import json

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

from .models import Message
from .serializers import MessageSerializer

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
        for uid in (msg.sender_id, msg.receiver_id):
            await self.channel_layer.group_send(
                f"user_{uid}",
                {"type": "chat.push", "message": payload},
            )

    async def chat_push(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @database_sync_to_async
    def _create_message(self, sender_id, receiver_id, content):
        if sender_id == receiver_id:
            return None
        if not User.objects.filter(pk=receiver_id).exists():
            return None
        return Message.objects.create(
            sender_id=sender_id, receiver_id=receiver_id, content=content
        )

    @database_sync_to_async
    def _serialize(self, msg):
        return MessageSerializer(msg).data
