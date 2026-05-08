from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.users.urls")),
    path("api/organizers/", include("apps.organizers.urls")),
    path("api/services/", include("apps.services.urls")),
    path("api/packages/", include("apps.packages.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/reviews/", include("apps.reviews.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/ai/", include("apps.ai_assistant.urls")),
    path("api/budget/", include("apps.packages.urls_budget")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
