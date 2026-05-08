from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AssistantLogViewSet

router = DefaultRouter()
router.register(r"logs", AssistantLogViewSet, basename="assistant-log")

urlpatterns = [path("", include(router.urls))]
