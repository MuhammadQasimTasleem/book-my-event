from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminDashboardAPIView,
    ClientDashboardAPIView,
    LoginAPIView,
    OrganizerDashboardAPIView,
    PasswordResetConfirmAPIView,
    PasswordResetRequestAPIView,
    ProfileAPIView,
    RegisterAPIView,
    VerifyEmailAPIView,
)

urlpatterns = [
    path("auth/register/", RegisterAPIView.as_view(), name="register"),
    path("auth/login/", LoginAPIView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/verify-email/", VerifyEmailAPIView.as_view(), name="verify_email"),
    path("auth/password-reset/", PasswordResetRequestAPIView.as_view(), name="password_reset"),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmAPIView.as_view(),
        name="password_reset_confirm",
    ),
    path("users/me/", ProfileAPIView.as_view(), name="profile"),
    path("dashboard/client/", ClientDashboardAPIView.as_view(), name="client_dashboard"),
    path(
        "dashboard/organizer/",
        OrganizerDashboardAPIView.as_view(),
        name="organizer_dashboard",
    ),
    path("dashboard/admin/", AdminDashboardAPIView.as_view(), name="admin_dashboard"),
]
