from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizerApproveAPIView,
    OrganizerPendingListAPIView,
    OrganizerProfileViewSet,
    OrganizerRejectAPIView,
)

router = DefaultRouter()
router.register(r"", OrganizerProfileViewSet, basename="organizer")

urlpatterns = [
    path("", include(router.urls)),
    path("pending/", OrganizerPendingListAPIView.as_view(), name="organizer_pending"),
    path("<int:pk>/approve/", OrganizerApproveAPIView.as_view(), name="organizer_approve"),
    path("<int:pk>/reject/", OrganizerRejectAPIView.as_view(), name="organizer_reject"),
]
