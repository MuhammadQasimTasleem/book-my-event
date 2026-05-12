from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Message
from .permissions import IsMessageParticipant
from .serializers import MessageSerializer


class MessageThreadPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    page_size = 100
    max_page_size = 500


def _broadcast_message(payload: dict) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    mid = payload.get("sender")
    rid = payload.get("receiver")
    if mid is None or rid is None:
        return
    event = {"type": "chat.message", "message": payload}
    for uid in (mid, rid):
        async_to_sync(layer.group_send)(f"user_{uid}", event)


def _broadcast_read_receipt(*, partner_id: int, reader_id: int, message_ids: list) -> None:
    layer = get_channel_layer()
    if not layer or not message_ids:
        return
    event = {
        "type": "chat.read_receipt",
        "reader_id": reader_id,
        "message_ids": message_ids,
    }
    async_to_sync(layer.group_send)(f"user_{partner_id}", event)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsMessageParticipant]
    pagination_class = MessageThreadPagination
    http_method_names = ["get", "post", "head", "options"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("with"):
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        user = self.request.user
        qs = (
            Message.objects.filter(Q(sender=user) | Q(receiver=user))
            .select_related("sender", "receiver")
            .distinct()
        )
        partner = self.request.query_params.get("with")
        if partner:
            try:
                pid = int(partner)
            except (TypeError, ValueError):
                return qs.none()
            return qs.filter(
                Q(sender_id=pid, receiver=user) | Q(sender=user, receiver_id=pid)
            ).order_by("created_at")
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        msg = serializer.save(sender=self.request.user)
        payload = MessageSerializer(msg, context={"request": self.request}).data
        _broadcast_message(payload)

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        partner = request.data.get("partner")
        try:
            pid = int(partner)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid partner."}, status=status.HTTP_400_BAD_REQUEST)
        qs = Message.objects.filter(sender_id=pid, receiver=request.user, is_read=False)
        ids = list(qs.values_list("pk", flat=True))
        updated = qs.update(is_read=True)
        if ids:
            _broadcast_read_receipt(partner_id=pid, reader_id=request.user.id, message_ids=ids)
        return Response({"marked": updated})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Message.objects.filter(receiver=request.user, is_read=False).count()
        return Response({"unread_count": count})
