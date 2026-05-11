from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BookingViewSet, ClientEventViewSet

router = DefaultRouter()
router.register(r"events", ClientEventViewSet, basename="client-event")
router.register(r"", BookingViewSet, basename="booking")

urlpatterns = [path("", include(router.urls))]
