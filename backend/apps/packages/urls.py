from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EventPackageViewSet, PackageItemViewSet

router = DefaultRouter()
router.register(r"", EventPackageViewSet, basename="package")
router.register(r"items", PackageItemViewSet, basename="package-item")

urlpatterns = [path("", include(router.urls))]
