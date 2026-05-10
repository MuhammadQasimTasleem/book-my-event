from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EventPackageViewSet, PackageItemViewSet

router = DefaultRouter()
# Register `items` before `""` so `/packages/items/` is not captured as package pk "items".
router.register(r"items", PackageItemViewSet, basename="package-item")
router.register(r"", EventPackageViewSet, basename="package")

urlpatterns = [path("", include(router.urls))]
