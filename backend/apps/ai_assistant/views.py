from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import AssistantLog
from .permissions import IsAssistantAdmin
from .serializers import AssistantLogSerializer


class AssistantLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AssistantLogSerializer
    permission_classes = [IsAuthenticated, IsAssistantAdmin]

    def get_queryset(self):
        return AssistantLog.objects.all()
