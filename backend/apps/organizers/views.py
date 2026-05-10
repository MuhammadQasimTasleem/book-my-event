from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.services.models import Service
from common.permissions import IsAdmin, IsOrganizer

from .models import OrganizerEventPhoto, OrganizerProfile
from .permissions import IsOrganizerOwner
from .serializers import OrganizerEventPhotoSerializer, OrganizerProfileSerializer
from .services import (
    approve_organizer,
    notify_admin_for_approval,
    profile_ready_for_approval,
    reject_organizer,
)

User = get_user_model()


class OrganizerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizerProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ["user"]

    def get_queryset(self):
        user = self.request.user
        base = OrganizerProfile.objects.select_related("user")
        if user.is_authenticated:
            if user.role == User.Role.ADMIN:
                qs = base.all()
            elif user.role == User.Role.ORGANIZER:
                qs = base.filter(user=user)
            else:
                qs = base.filter(approval_status=OrganizerProfile.Status.APPROVED)
        else:
            qs = base.filter(approval_status=OrganizerProfile.Status.APPROVED)
        return qs.prefetch_related(
            Prefetch(
                "user__services",
                queryset=Service.objects.select_related("category")
                .only(
                    "id",
                    "title",
                    "organizer_id",
                    "event_type",
                    "service_type",
                    "offering_label",
                    "price",
                    "tier_prices",
                    "pricing_unit",
                    "event_types",
                    "category_id",
                    "category__name",
                )
                .order_by("id"),
            ),
            Prefetch(
                "user__event_photos",
                queryset=OrganizerEventPhoto.objects.only(
                    "id",
                    "image",
                    "caption",
                    "sort_order",
                    "created_at",
                    "user_id",
                ).order_by("sort_order", "id"),
            ),
        ).annotate(
            services_count=Count("user__services", distinct=True),
            average_rating=Avg(
                "user__reviews_received__rating",
                filter=Q(user__reviews_received__is_visible=True),
            ),
        )

    def create(self, request, *args, **kwargs):
        if not request.user.is_authenticated or request.user.role != User.Role.ORGANIZER:
            return Response({"message": "Only organizers can create profiles."}, status=403)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated and request.user.role == User.Role.ADMIN:
            return super().update(request, *args, **kwargs)
        if not IsOrganizerOwner().has_object_permission(request, self, instance):
            return Response({"message": "Not allowed."}, status=403)
        return super().update(request, *args, **kwargs)


class OrganizerSubmitForApprovalAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def post(self, request):
        profile = getattr(request.user, "organizer_profile", None)
        if not profile:
            return Response(
                {"detail": "Create your organizer profile first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if profile.approval_status not in (
            OrganizerProfile.Status.DRAFT,
            OrganizerProfile.Status.REJECTED,
        ):
            return Response(
                {"detail": "Profile is not in a state that allows submission."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ready, errs = profile_ready_for_approval(profile, request.user)
        if not ready:
            return Response(
                {"detail": " ".join(errs)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.approval_status = OrganizerProfile.Status.PENDING
        profile.approval_notes = ""
        profile.save(update_fields=["approval_status", "approval_notes"])

        def _notify_admins():
            notify_admin_for_approval(profile)

        transaction.on_commit(_notify_admins)
        serializer = OrganizerProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)


class OrganizerPendingListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        pending = OrganizerProfile.objects.filter(approval_status=OrganizerProfile.Status.PENDING)
        serializer = OrganizerProfileSerializer(pending, many=True)
        return Response(serializer.data)


class OrganizerApproveAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        profile = get_object_or_404(OrganizerProfile, pk=pk)
        if profile.approval_status != OrganizerProfile.Status.PENDING:
            return Response(
                {"detail": "Only organizers in pending review can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ready, errs = profile_ready_for_approval(profile, profile.user)
        if not ready:
            return Response(
                {"detail": "Profile is not complete: " + " ".join(errs)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        approve_organizer(profile, request.user)
        return Response({"message": "Organizer approved."})


class OrganizerRejectAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        reason = request.data.get("reason", "")
        profile = get_object_or_404(OrganizerProfile, pk=pk)
        reject_organizer(profile, request.user, reason)
        return Response({"message": "Organizer rejected."})


MAX_EVENT_PHOTOS_PER_ORGANIZER = 30


class OrganizerEventPhotoListCreateAPIView(APIView):
    """List or upload portfolio / past-event images (multipart)."""

    permission_classes = [IsAuthenticated, IsOrganizer]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        photos = OrganizerEventPhoto.objects.filter(user=request.user).order_by(
            "sort_order", "id"
        )
        return Response(
            OrganizerEventPhotoSerializer(
                photos, many=True, context={"request": request}
            ).data
        )

    def post(self, request):
        if (
            OrganizerEventPhoto.objects.filter(user=request.user).count()
            >= MAX_EVENT_PHOTOS_PER_ORGANIZER
        ):
            return Response(
                {
                    "detail": f"Maximum {MAX_EVENT_PHOTOS_PER_ORGANIZER} event photos allowed. Delete some to add more."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        image = request.FILES.get("image")
        if not image:
            return Response(
                {"detail": "No image file provided (use field name 'image')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        caption = str(request.data.get("caption") or "")[:500]
        photo = OrganizerEventPhoto.objects.create(
            user=request.user,
            image=image,
            caption=caption,
        )
        return Response(
            OrganizerEventPhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizerEventPhotoDestroyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        photo = get_object_or_404(OrganizerEventPhoto, pk=pk)
        if request.user.role == User.Role.ADMIN:
            pass
        elif (
            request.user.role == User.Role.ORGANIZER and photo.user_id == request.user.id
        ):
            pass
        else:
            return Response(
                {"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN
            )
        if photo.image:
            photo.image.delete(save=False)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
