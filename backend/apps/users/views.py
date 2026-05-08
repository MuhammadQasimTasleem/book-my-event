from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from rest_framework import status
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
    CustomTokenObtainPairSerializer,
    EmailVerificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services import request_password_reset, reset_password, send_verification_email, verify_email_token

User = get_user_model()


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user, request=request)
        return Response({"message": "Registration successful. Verify your email."}, status=201)


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
        avg_rating = Review.objects.filter(organizer=request.user).aggregate(
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
        data = {
            "total_users": users.count(),
            "total_organizers": organizers.count(),
            "pending_approvals": pending_approvals.count(),
            "total_bookings": bookings.count(),
            "top_categories": list(top_categories),
        }
        return Response(data)
