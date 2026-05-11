from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Message
from .services import can_exchange_organizer_client_messages

User = get_user_model()


class ChatUserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "display_name")
        read_only_fields = fields

    def get_display_name(self, obj) -> str:
        name = (obj.get_full_name() or "").strip()
        if name:
            return name
        return (obj.email or obj.username or str(obj.pk)).strip()


class MessageSerializer(serializers.ModelSerializer):
    sender_detail = ChatUserSerializer(source="sender", read_only=True)
    receiver_detail = ChatUserSerializer(source="receiver", read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "sender",
            "receiver",
            "sender_detail",
            "receiver_detail",
            "content",
            "image",
            "is_read",
            "created_at",
        )
        read_only_fields = (
            "sender",
            "sender_detail",
            "receiver_detail",
            "is_read",
            "created_at",
        )
        extra_kwargs = {"image": {"required": False, "allow_null": True}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.image:
            request = self.context.get("request")
            url = instance.image.url
            if request:
                data["image"] = request.build_absolute_uri(url)
            else:
                base = getattr(settings, "SITE_URL", "").rstrip("/")
                data["image"] = f"{base}{url}" if base and url.startswith("/") else url
        else:
            data["image"] = None
        return data

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")
        receiver = attrs.get("receiver")
        if receiver is None:
            return attrs
        if receiver.pk == request.user.pk:
            raise serializers.ValidationError({"receiver": "Cannot message yourself."})
        if not can_exchange_organizer_client_messages(request.user, receiver):
            raise serializers.ValidationError(
                {"receiver": "Messaging is only allowed between clients and approved organizers."}
            )
        if self.instance is None:
            content = (attrs.get("content") or "").strip()
            image = attrs.get("image")
            if not content and not image:
                raise serializers.ValidationError(
                    {"content": "Enter a message, an emoji, or attach an image."}
                )
            attrs["content"] = content
        return attrs
