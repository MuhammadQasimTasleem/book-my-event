from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from common.permissions import IsAdmin, IsApprovedOrganizer
from .models import Service, ServiceCategory
from .permissions import IsServiceOwner
from .serializers import ServiceCategorySerializer, ServiceSerializer


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.select_related("category", "organizer").all()
    serializer_class = ServiceSerializer
    filterset_fields = ["category", "tier", "location", "price"]
    search_fields = ["title", "description", "location"]
    ordering_fields = ["price", "rating", "created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["create"]:
            return [IsAuthenticated(), IsApprovedOrganizer()]
        return [IsAuthenticated(), IsApprovedOrganizer(), IsServiceOwner()]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)
