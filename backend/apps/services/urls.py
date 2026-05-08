from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ServiceCategoryViewSet, ServiceViewSet

router = DefaultRouter()
router.register(r"categories", ServiceCategoryViewSet, basename="category")
router.register(r"", ServiceViewSet, basename="service")

urlpatterns = [path("", include(router.urls))]
