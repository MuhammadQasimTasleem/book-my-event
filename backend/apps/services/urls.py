from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ServiceBulkCreateAPIView,
    ServiceCategoryViewSet,
    ServiceImageDestroyView,
    ServiceImageUploadView,
    ServiceTierImageDestroyView,
    ServiceTierImageUploadView,
    ServiceViewSet,
)

router = DefaultRouter()
router.register(r"categories", ServiceCategoryViewSet, basename="category")
router.register(r"", ServiceViewSet, basename="service")

urlpatterns = [
    path("bulk/", ServiceBulkCreateAPIView.as_view(), name="service-bulk-create"),
    path("<int:pk>/images/<int:index>/", ServiceImageDestroyView.as_view()),
    path("<int:pk>/images/", ServiceImageUploadView.as_view()),
    path("<int:pk>/tier-images/<str:tier>/", ServiceTierImageUploadView.as_view()),
    path(
        "<int:pk>/tier-images/<str:tier>/delete/",
        ServiceTierImageDestroyView.as_view(),
    ),
    path("", include(router.urls)),
]
