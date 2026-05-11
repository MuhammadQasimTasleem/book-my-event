from django.contrib.auth import get_user_model
from django.db.models import Avg
from rest_framework import serializers

from apps.reviews.models import Review
from apps.services.models import Service
from apps.services.pricing import tier_unit_price_bounds
from .models import OrganizerEventPhoto, OrganizerProfile

User = get_user_model()


def _event_types_from_service(s: Service) -> list[str]:
    out: list[str] = []
    raw = getattr(s, "event_types", None) or []
    if isinstance(raw, list):
        for x in raw:
            t = str(x).strip()
            if t:
                out.append(t)
    et = (getattr(s, "event_type", None) or "").strip()
    if et:
        for part in et.split(","):
            t = part.strip()
            if t:
                out.append(t)
    return out


class OrganizerEventPhotoSerializer(serializers.ModelSerializer):
    """Absolute image URL for clients (Next/Image, etc.)."""

    image = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrganizerEventPhoto
        fields = ("id", "image", "caption", "sort_order", "created_at")
        read_only_fields = fields

    def get_image(self, obj):
        if not obj.image:
            return None
        url = obj.image.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url


class OrganizerProfileSerializer(serializers.ModelSerializer):
    """Profile CRUD + public list fields (use queryset annotate for list performance)."""

    display_name = serializers.SerializerMethodField(read_only=True)
    average_rating = serializers.SerializerMethodField(read_only=True)
    services_count = serializers.SerializerMethodField(read_only=True)
    service_preview = serializers.SerializerMethodField(read_only=True)
    service_types_preview = serializers.SerializerMethodField(read_only=True)
    event_types_preview = serializers.SerializerMethodField(read_only=True)
    price_range = serializers.SerializerMethodField(read_only=True)
    event_photos = serializers.SerializerMethodField(read_only=True)
    contact_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = OrganizerProfile
        fields = (
            "id",
            "user",
            "display_name",
            "contact_email",
            "company_name",
            "description",
            "approval_status",
            "approval_notes",
            "approved_by",
            "approved_at",
            "average_rating",
            "services_count",
            "service_preview",
            "service_types_preview",
            "event_types_preview",
            "price_range",
            "event_photos",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("user", "approved_by", "approved_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        admin = (
            request
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )
        if not admin:
            self.fields["approval_status"].read_only = True
            self.fields["approval_notes"].read_only = True

    def get_display_name(self, obj):
        u = obj.user
        name = f"{u.first_name} {u.last_name}".strip()
        return name or u.username or u.email

    def get_average_rating(self, obj):
        v = getattr(obj, "average_rating", None)
        if v is not None:
            return round(float(v), 2)
        agg = Review.objects.filter(reviewee=obj.user, is_visible=True).aggregate(
            avg=Avg("rating")
        )
        return round(float(agg["avg"]), 2) if agg["avg"] is not None else 0.0

    def get_services_count(self, obj):
        v = getattr(obj, "services_count", None)
        if v is not None:
            return int(v)
        return Service.objects.filter(organizer=obj.user).count()

    def get_service_preview(self, obj):
        rows = list(obj.user.services.all()[:4])
        if not rows:
            rows = list(
                Service.objects.filter(organizer_id=obj.user_id)
                .select_related("category")
                .order_by("-updated_at", "-id")[:4]
            )
        return [s.listing_title() for s in rows]

    def get_service_types_preview(self, obj):
        seen: set[str] = set()
        out: list[str] = []
        for s in obj.user.services.all():
            st = (getattr(s, "service_type", None) or "").strip()
            if not st:
                continue
            k = st.lower()
            if k in seen:
                continue
            seen.add(k)
            out.append(st)
            if len(out) >= 6:
                break
        return out

    def get_event_types_preview(self, obj):
        seen: set[str] = set()
        out: list[str] = []
        for s in obj.user.services.all():
            for label in _event_types_from_service(s):
                k = label.lower()
                if k in seen:
                    continue
                seen.add(k)
                out.append(label)
                if len(out) >= 10:
                    return out
        return out

    def get_price_range(self, obj):
        services = list(obj.user.services.all())
        if not services:
            return None
        lows: list[float] = []
        highs: list[float] = []
        for s in services:
            lo, hi = tier_unit_price_bounds(s)
            lows.append(float(lo))
            highs.append(float(hi))
        return {
            "min": round(min(lows), 2),
            "max": round(max(highs), 2),
        }

    def get_event_photos(self, obj):
        photos = obj.user.event_photos.all()
        return OrganizerEventPhotoSerializer(
            photos, many=True, context=self.context
        ).data
