from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizerApproveAPIView,
    OrganizerEventPhotoDestroyAPIView,
    OrganizerEventPhotoListCreateAPIView,
    OrganizerPendingListAPIView,
    OrganizerProfileViewSet,
    OrganizerRejectAPIView,
    OrganizerSubmitForApprovalAPIView,
)

router = DefaultRouter()
router.register(r"", OrganizerProfileViewSet, basename="organizer")

urlpatterns = [
    path(
        "event-photos/",
        OrganizerEventPhotoListCreateAPIView.as_view(),
        name="organizer_event_photos",
    ),
    path(
        "event-photos/<int:pk>/",
        OrganizerEventPhotoDestroyAPIView.as_view(),
        name="organizer_event_photo_delete",
    ),
    path("pending/", OrganizerPendingListAPIView.as_view(), name="organizer_pending"),
    path(
        "submit-for-approval/",
        OrganizerSubmitForApprovalAPIView.as_view(),
        name="organizer_submit_for_approval",
    ),
    path("<int:pk>/approve/", OrganizerApproveAPIView.as_view(), name="organizer_approve"),
    path("<int:pk>/reject/", OrganizerRejectAPIView.as_view(), name="organizer_reject"),
    path("", include(router.urls)),
]
