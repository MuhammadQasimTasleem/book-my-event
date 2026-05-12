import os
import uuid
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizers.models import OrganizerProfile
from common.permissions import CanOrganizerManageOwnServices, IsAdmin
from .models import Service, ServiceCategory
from .permissions import IsServiceOwner
from .pricing import TIER_KEYS
from .serializers import ServiceCategorySerializer, ServiceSerializer

User = get_user_model()

MAX_SERVICE_IMAGES = 12
MAX_UPLOAD_BYTES = 6 * 1024 * 1024


def _organizer_may_manage_own_service_listings(user) -> bool:
    if not user.is_authenticated or user.role != User.Role.ORGANIZER:
        return False
    profile = getattr(user, "organizer_profile", None)
    if not profile:
        return False
    return profile.approval_status in (
        OrganizerProfile.Status.DRAFT,
        OrganizerProfile.Status.PENDING,
        OrganizerProfile.Status.APPROVED,
        OrganizerProfile.Status.REJECTED,
    )


def _service_write_allowed(user, service: Service) -> bool:
    if not user.is_authenticated:
        return False
    if user.role == User.Role.ADMIN:
        return True
    if user.role != User.Role.ORGANIZER:
        return False
    if not _organizer_may_manage_own_service_listings(user):
        return False
    return service.organizer_id == user.id


def _absolute_media_url(request, storage_name: str) -> str:
    name = storage_name.replace("\\", "/").lstrip("/")
    media = settings.MEDIA_URL.strip("/")
    path = f"/{media}/{name}" if media else f"/{name}"
    if request:
        return request.build_absolute_uri(path)
    return path


def _try_delete_stored_file(url: str) -> None:
    """Remove file from default storage if URL path is under MEDIA_URL."""
    if not url or not settings.MEDIA_URL:
        return
    path = urlparse(url).path if url.startswith("http") else url
    if not path.startswith("/"):
        path = "/" + path
    media_prefix = settings.MEDIA_URL.strip("/")
    segs = path.strip("/").split("/", 1)
    if len(segs) == 2 and segs[0] == media_prefix:
        rel = segs[1]
        if default_storage.exists(rel):
            default_storage.delete(rel)


def _clean_tier_key(raw: str | None) -> str | None:
    key = str(raw or "").strip().lower()
    return key if key in TIER_KEYS else None


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    filterset_fields = ["category", "tier", "location", "price", "organizer"]
    search_fields = [
        "title",
        "description",
        "location",
        "event_type",
        "service_type",
    ]
    ordering_fields = ["price", "rating", "created_at", "updated_at"]
    ordering = ["-updated_at", "-id"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["create"]:
            return [IsAuthenticated(), CanOrganizerManageOwnServices()]
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.ADMIN:
            return [IsAuthenticated(), IsAdmin()]
        return [
            IsAuthenticated(),
            CanOrganizerManageOwnServices(),
            IsServiceOwner(),
        ]

    def get_queryset(self):
        qs = (
            Service.objects.select_related("category", "organizer")
            .annotate(
                review_count=Count(
                    "organizer__reviews_received",
                    filter=Q(organizer__reviews_received__is_visible=True),
                )
            )
            .all()
            .order_by("-updated_at", "-id")
        )
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.ADMIN:
            return qs
        if user.is_authenticated and user.role == User.Role.ORGANIZER:
            return qs.filter(organizer=user)
        return qs.filter(
            organizer__organizer_profile__approval_status=OrganizerProfile.Status.APPROVED
        )

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class ServiceBulkCreateAPIView(APIView):
    """Create many services in one transaction (organizers only)."""

    permission_classes = [IsAuthenticated, CanOrganizerManageOwnServices]
    MAX_BATCH = 40

    def post(self, request):
        if request.user.role != User.Role.ORGANIZER:
            return Response(
                {"detail": "Only organizers may use bulk create."},
                status=status.HTTP_403_FORBIDDEN,
            )
        raw = request.data.get("services")
        if not isinstance(raw, list) or len(raw) == 0:
            return Response(
                {"detail": "Provide a non-empty 'services' array."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(raw) > self.MAX_BATCH:
            return Response(
                {"detail": f"At most {self.MAX_BATCH} services per request."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for i, item in enumerate(raw):
            if not isinstance(item, dict):
                return Response(
                    {"detail": f"services[{i}] must be an object."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        results = []
        with transaction.atomic():
            for item in raw:
                serializer = ServiceSerializer(data=item, context={"request": request})
                serializer.is_valid(raise_exception=True)
                serializer.save(organizer=request.user)
                results.append(serializer.data)
        return Response(
            {"results": results, "count": len(results)},
            status=status.HTTP_201_CREATED,
        )


class ServiceImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        service = get_object_or_404(Service, pk=pk)
        if not _service_write_allowed(request.user, service):
            return Response(
                {"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN
            )
        images = service.images or []
        if not isinstance(images, list):
            images = []
        if len(images) >= MAX_SERVICE_IMAGES:
            return Response(
                {
                    "detail": f"Maximum {MAX_SERVICE_IMAGES} images per service. Remove one to add more."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload = request.FILES.get("image")
        if not upload:
            return Response(
                {"detail": "No image file provided (field name 'image')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size and upload.size > MAX_UPLOAD_BYTES:
            return Response(
                {"detail": "Image too large (max 6 MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ctype = (upload.content_type or "").lower()
        if not ctype.startswith("image/"):
            return Response(
                {"detail": "File must be an image."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orig = getattr(upload, "name", "") or "upload.jpg"
        ext = os.path.splitext(orig)[1][:10].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ""):
            ext = ".jpg"
        storage_name = f"service_work/{uuid.uuid4().hex}{ext}"
        data = upload.read()
        saved = default_storage.save(storage_name, ContentFile(data))
        rel_url = default_storage.url(saved)
        url = request.build_absolute_uri(rel_url) if request else rel_url
        images.append(rel_url)
        service.images = images
        service.save(update_fields=["images", "updated_at"])
        return Response(
            {"url": url, "images": images},
            status=status.HTTP_201_CREATED,
        )


class ServiceImageDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, index):
        service = get_object_or_404(Service, pk=pk)
        if not _service_write_allowed(request.user, service):
            return Response(
                {"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN
            )
        images = service.images or []
        if not isinstance(images, list) or index < 0 or index >= len(images):
            return Response(
                {"detail": "Invalid image index."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        removed = images.pop(index)
        _try_delete_stored_file(removed)
        service.images = images
        service.save(update_fields=["images", "updated_at"])
        return Response({"images": images}, status=status.HTTP_200_OK)


class ServiceTierImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk, tier):
        service = get_object_or_404(Service, pk=pk)
        if not _service_write_allowed(request.user, service):
            return Response(
                {"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN
            )
        tier_key = _clean_tier_key(tier)
        if not tier_key:
            return Response(
                {"detail": "Invalid tier key."}, status=status.HTTP_400_BAD_REQUEST
            )
        upload = request.FILES.get("image")
        if not upload:
            return Response(
                {"detail": "No image file provided (field name 'image')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size and upload.size > MAX_UPLOAD_BYTES:
            return Response(
                {"detail": "Image too large (max 6 MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ctype = (upload.content_type or "").lower()
        if not ctype.startswith("image/"):
            return Response(
                {"detail": "File must be an image."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orig = getattr(upload, "name", "") or "upload.jpg"
        ext = os.path.splitext(orig)[1][:10].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ""):
            ext = ".jpg"
        storage_name = f"service_tiers/{tier_key}/{uuid.uuid4().hex}{ext}"
        data = upload.read()
        saved = default_storage.save(storage_name, ContentFile(data))
        rel_url = default_storage.url(saved)
        url = request.build_absolute_uri(rel_url) if request else rel_url
        tier_images = service.tier_images or {}
        if not isinstance(tier_images, dict):
            tier_images = {}
        old = str(tier_images.get(tier_key) or "").strip()
        if old:
            _try_delete_stored_file(old)
        tier_images[tier_key] = rel_url
        service.tier_images = tier_images
        service.save(update_fields=["tier_images", "updated_at"])
        return Response(
            {"url": url, "tier_images": tier_images},
            status=status.HTTP_201_CREATED,
        )


class ServiceTierImageDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, tier):
        service = get_object_or_404(Service, pk=pk)
        if not _service_write_allowed(request.user, service):
            return Response(
                {"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN
            )
        tier_key = _clean_tier_key(tier)
        if not tier_key:
            return Response(
                {"detail": "Invalid tier key."}, status=status.HTTP_400_BAD_REQUEST
            )
        tier_images = service.tier_images or {}
        if not isinstance(tier_images, dict) or not str(
            tier_images.get(tier_key) or ""
        ).strip():
            return Response(
                {"detail": "No image stored for that tier."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        removed = str(tier_images.pop(tier_key))
        _try_delete_stored_file(removed)
        service.tier_images = tier_images
        service.save(update_fields=["tier_images", "updated_at"])
        return Response({"tier_images": tier_images}, status=status.HTTP_200_OK)
