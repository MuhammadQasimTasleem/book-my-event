from django.contrib.auth import get_user_model
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from common.permissions import IsAdmin
from .models import Review
from .permissions import IsReviewOwner
from .serializers import ReviewSerializer

User = get_user_model()


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("reviewee", "reviewer")
    ordering_fields = ("created_at", "rating")
    ordering = ("-created_at",)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Review.objects.filter(is_visible=True)
        if user.role == User.Role.ADMIN:
            return Review.objects.all()
        return Review.objects.filter(is_visible=True)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["update", "partial_update", "destroy"]:
            if (
                self.request.user.is_authenticated
                and self.request.user.role == User.Role.ADMIN
            ):
                return [IsAuthenticated(), IsAdmin()]
            return [IsAuthenticated(), IsReviewOwner()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)
