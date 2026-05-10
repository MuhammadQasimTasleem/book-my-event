from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.bookings.models import Booking
from apps.organizers.models import OrganizerProfile
from apps.reviews.models import Review
from apps.services.models import Service, ServiceCategory
from common.permissions import IsAdmin, IsClient, IsOrganizer
from .serializers import (
    AdminUserManageSerializer,
    AdminUserSerializer,
    CustomTokenObtainPairSerializer,
    EmailVerificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services import (
    request_password_reset,
    resend_verification_email,
    reset_password,
    send_verification_email,
    verify_email_token,
)

User = get_user_model()


def _send_verification_after_register(user_id: int) -> None:
    user = User.objects.get(pk=user_id)
    send_verification_email(user)


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = serializer.save()
            if not getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True):
                user.is_verified = True
                user.save(update_fields=["is_verified"])
                return Response(
                    {
                        "message": "Registration successful. You can sign in now.",
                        "requires_verification": False,
                    },
                    status=201,
                )
            # Send after commit so we don’t hold a DB transaction open during SMTP.
            uid = user.pk
            transaction.on_commit(lambda u_id=uid: _send_verification_after_register(u_id))
        return Response(
            {
                "message": "Registration successful. Check your email to verify your account before signing in.",
                "requires_verification": True,
            },
            status=201,
        )


class LoginAPIView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class VerifyEmailAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token") or request.query_params.get("token")
        if not token:
            return Response({"message": "Token is required."}, status=400)
        try:
            verify_email_token(token)
        except Exception:
            return Response({"message": "Invalid or expired token."}, status=400)
        return Response({"message": "Email verified successfully."})


class ResendVerificationAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        resend_verification_email(email)
        return Response(
            {
                "message": "If an unverified account exists for this email, we sent a new verification link."
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_password_reset(serializer.validated_data["email"])
        return Response({"message": "If the email exists, a reset link was sent."})


class PasswordResetConfirmAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reset_password(
                serializer.validated_data["token"],
                serializer.validated_data["new_password"],
            )
        except Exception:
            return Response({"message": "Invalid or expired token."}, status=400)
        return Response({"message": "Password updated successfully."})


class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ClientDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        bookings = Booking.objects.filter(client=request.user)
        data = {
            "total_bookings": bookings.count(),
            "pending_bookings": bookings.filter(booking_status=Booking.Status.PENDING).count(),
            "completed_bookings": bookings.filter(booking_status=Booking.Status.COMPLETED).count(),
        }
        return Response(data)


class OrganizerDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request):
        services = Service.objects.filter(organizer=request.user)
        bookings = Booking.objects.filter(organizer=request.user)
        avg_rating = Review.objects.filter(reviewee=request.user).aggregate(
            avg=Avg("rating")
        )["avg"]
        data = {
            "total_services": services.count(),
            "total_bookings": bookings.count(),
            "pending_bookings": bookings.filter(booking_status=Booking.Status.PENDING).count(),
            "completed_bookings": bookings.filter(booking_status=Booking.Status.COMPLETED).count(),
            "average_rating": round(avg_rating or 0, 2),
        }
        return Response(data)


class AdminUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ["role", "is_active"]
    search_fields = ["email", "username", "first_name", "last_name"]

    def get_serializer_class(self):
        if self.action in ("partial_update", "update"):
            return AdminUserManageSerializer
        return AdminUserSerializer

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.pk == request.user.pk:
            forbidden = {"is_active", "role"} & set(request.data.keys())
            if forbidden:
                return Response(
                    {
                        "detail": "You cannot change your own active flag or role from this screen."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise PermissionDenied("You cannot delete your own account.")
        instance.delete()


class AdminDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all()
        organizers = User.objects.filter(role=User.Role.ORGANIZER)
        pending_approvals = OrganizerProfile.objects.filter(
            approval_status=OrganizerProfile.Status.PENDING
        )
        bookings = Booking.objects.all()
        top_categories = (
            ServiceCategory.objects.annotate(bookings=Count("services__bookings"))
            .order_by("-bookings")
            .values("name", "bookings")[:5]
        )
        week_ago = timezone.now() - timedelta(days=7)
        data = {
            "total_users": users.count(),
            "total_clients": users.filter(role=User.Role.CLIENT).count(),
            "total_organizers": organizers.count(),
            "pending_approvals": pending_approvals.count(),
            "total_bookings": bookings.count(),
            "pending_bookings": bookings.filter(
                booking_status=Booking.Status.PENDING
            ).count(),
            "total_services": Service.objects.count(),
            "total_categories": ServiceCategory.objects.filter(is_active=True).count(),
            "total_reviews": Review.objects.count(),
            "signups_last_7_days": users.filter(created_at__gte=week_ago).count(),
            "top_categories": list(top_categories),
        }
        return Response(data)
