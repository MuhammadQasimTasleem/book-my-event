from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin, IsClient
from .models import EventPackage, PackageItem
from .permissions import IsPackageOwner
from .serializers import (
    BudgetEstimateRequestSerializer,
    EventPackageSerializer,
    PackageItemSerializer,
)
from .services import estimate_items, estimate_package_budget, update_package_estimate


class EventPackageViewSet(viewsets.ModelViewSet):
    serializer_class = EventPackageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return EventPackage.objects.all()
        return EventPackage.objects.filter(client=user)

    def get_permissions(self):
        if self.action in ["create"]:
            return [IsAuthenticated(), IsClient()]
        return [IsAuthenticated(), IsPackageOwner()]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)


class PackageItemViewSet(viewsets.ModelViewSet):
    serializer_class = PackageItemSerializer
    permission_classes = [IsAuthenticated, IsClient]

    def get_queryset(self):
        return PackageItem.objects.filter(package__client=self.request.user)

    def perform_create(self, serializer):
        package = serializer.validated_data["package"]
        if package.client_id != self.request.user.id:
            raise PermissionDenied("Not allowed.")
        item = serializer.save()
        update_package_estimate(package)
        return item

    def perform_update(self, serializer):
        item = serializer.save()
        update_package_estimate(item.package)
        return item

    def perform_destroy(self, instance):
        package = instance.package
        instance.delete()
        update_package_estimate(package)


class BudgetEstimateAPIView(APIView):
    """Item-only estimates are public so guests can use Plan an event."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BudgetEstimateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get("package_id"):
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication required for package estimates."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            package = get_object_or_404(EventPackage, pk=data["package_id"])
            if package.client_id != request.user.id and request.user.role != request.user.Role.ADMIN:
                return Response({"message": "Not allowed."}, status=403)
            summary = estimate_package_budget(package)
        else:
            summary = estimate_items(data.get("items", []))

        return Response(
            {
                "total_estimate": summary["total"],
                "min_estimate": summary["min_total"],
                "max_estimate": summary["max_total"],
                "breakdown": summary["breakdown"],
                "suggestions": summary["suggestions"],
            }
        )
