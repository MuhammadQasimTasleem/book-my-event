from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.utils.text import slugify
from rest_framework import serializers

from apps.organizers.models import OrganizerProfile
from .models import Service, ServiceCategory
from .pricing import TIER_KEYS, tier_unit_price_bounds

User = get_user_model()

MAX_AMENITIES = 20
MAX_AMENITY_LEN = 64
MAX_EVENT_TYPES = 20
MAX_EVENT_TYPE_LEN = 64
MAX_OFFERING_LABEL_LEN = 120
MAX_TIER_DETAIL_LEN = 2000


class ServiceCategorySerializer(serializers.ModelSerializer):
    slug = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = ("id", "name", "slug", "is_active")

    def get_slug(self, obj):
        return slugify(obj.name)


class ServiceSerializer(serializers.ModelSerializer):
    organizer_name = serializers.SerializerMethodField()
    category = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.all(), required=False, allow_null=True
    )
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True)
    primary_image = serializers.SerializerMethodField()
    price_min = serializers.SerializerMethodField()
    price_max = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = (
            "id",
            "organizer",
            "organizer_name",
            "title",
            "description",
            "category",
            "category_name",
            "category_slug",
            "event_type",
            "service_type",
            "offering_label",
            "tier",
            "price",
            "pricing_unit",
            "tier_prices",
            "tier_details",
            "tier_images",
            "included_amenities",
            "event_types",
            "price_min",
            "price_max",
            "location",
            "rating",
            "review_count",
            "availability",
            "images",
            "primary_image",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("organizer", "rating", "review_count")

    def get_organizer_name(self, obj):
        u = obj.organizer
        name = f"{u.first_name} {u.last_name}".strip()
        return name or u.username or u.email

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ""

    def get_category_slug(self, obj):
        return slugify(obj.category.name) if obj.category else ""

    def get_primary_image(self, obj):
        imgs = obj.images or []
        if isinstance(imgs, list) and len(imgs) > 0:
            return imgs[0]
        return None

    def get_price_min(self, obj):
        lo, _hi = tier_unit_price_bounds(obj)
        return format(lo, "f")

    def get_price_max(self, obj):
        _lo, hi = tier_unit_price_bounds(obj)
        return format(hi, "f")

    def validate_tier_prices(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("tier_prices must be an object.")
        out = {}
        allowed = set(TIER_KEYS)
        for key, raw in value.items():
            if key not in allowed:
                raise serializers.ValidationError(
                    f"Invalid tier key: {key!r}. Allowed: {', '.join(allowed)}."
                )
            if raw is None or raw == "":
                continue
            try:
                d = Decimal(str(raw))
            except (InvalidOperation, TypeError, ValueError):
                raise serializers.ValidationError(f"Invalid price for {key!r}.")
            if d < 0:
                raise serializers.ValidationError(f"Price for {key!r} must be non-negative.")
            out[key] = format(d, "f")
        return out

    def validate_included_amenities(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("included_amenities must be a list.")
        if len(value) > MAX_AMENITIES:
            raise serializers.ValidationError(
                f"At most {MAX_AMENITIES} amenities allowed."
            )
        cleaned = []
        for item in value:
            s = str(item).strip()
            if not s:
                continue
            if len(s) > MAX_AMENITY_LEN:
                raise serializers.ValidationError(
                    f"Each amenity must be at most {MAX_AMENITY_LEN} characters."
                )
            cleaned.append(s)
        return cleaned

    def validate_tier_details(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("tier_details must be an object.")
        out = {}
        allowed = set(TIER_KEYS)
        for key, raw in value.items():
            if key not in allowed:
                raise serializers.ValidationError(
                    f"Invalid tier_details key: {key!r}. Allowed: {', '.join(allowed)}."
                )
            s = str(raw or "").strip()
            if len(s) > MAX_TIER_DETAIL_LEN:
                raise serializers.ValidationError(
                    f"Details for {key!r} must be at most {MAX_TIER_DETAIL_LEN} characters."
                )
            out[key] = s
        return out

    def validate_tier_images(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("tier_images must be an object.")
        out = {}
        allowed = set(TIER_KEYS)
        for key, raw in value.items():
            if key not in allowed:
                raise serializers.ValidationError(
                    f"Invalid tier_images key: {key!r}. Allowed: {', '.join(allowed)}."
                )
            s = str(raw or "").strip()
            out[key] = s
        return out

    def validate_offering_label(self, value):
        if value is None:
            return ""
        s = str(value).strip()
        if len(s) > MAX_OFFERING_LABEL_LEN:
            raise serializers.ValidationError(
                f"At most {MAX_OFFERING_LABEL_LEN} characters."
            )
        return s

    def validate_event_types(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("event_types must be a list.")
        if len(value) > MAX_EVENT_TYPES:
            raise serializers.ValidationError(
                f"At most {MAX_EVENT_TYPES} event types allowed."
            )
        cleaned = []
        seen = set()
        for item in value:
            s = str(item).strip()
            if not s:
                continue
            if len(s) > MAX_EVENT_TYPE_LEN:
                raise serializers.ValidationError(
                    f"Each event type must be at most {MAX_EVENT_TYPE_LEN} characters."
                )
            key = s.casefold()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(s)
        return cleaned

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        if user and user.role == User.Role.ADMIN:
            if "tier_prices" in attrs and attrs["tier_prices"] is not None:
                attrs["tier_prices"] = self.validate_tier_prices(attrs["tier_prices"])
            if "event_types" in attrs and attrs["event_types"] is not None:
                attrs["event_types"] = self.validate_event_types(attrs["event_types"])
                et = attrs["event_types"]
                if et:
                    attrs["event_type"] = ", ".join(et)[:500]
            return attrs

        if user and user.role == User.Role.ORGANIZER:
            profile = getattr(user, "organizer_profile", None)
            if not profile or not profile.is_approved:
                raise serializers.ValidationError("Organizer is not approved.")

            inst = self.instance
            st = attrs.get("service_type", getattr(inst, "service_type", "") if inst else "")
            st = str(st or "").strip()
            if not st:
                raise serializers.ValidationError({"service_type": "Service type is required."})
            attrs["service_type"] = st

            raw_et = attrs.get("event_types", None)
            if raw_et is None and inst is not None:
                raw_et = inst.event_types
            if not raw_et:
                raw_et = []
            if (
                (not raw_et or raw_et == [])
                and inst is not None
                and (inst.event_type or "").strip()
            ):
                raw_et = [
                    x.strip()
                    for x in (inst.event_type or "").split(",")
                    if x.strip()
                ]
            et_cleaned = self.validate_event_types(
                raw_et if isinstance(raw_et, list) else []
            )
            if not et_cleaned:
                raise serializers.ValidationError(
                    {
                        "event_types": "Select at least one event type (you can choose many). "
                        "Each published line is one service with one set of simple / moderate / "
                        "luxury per-head prices — publish again for another service."
                    }
                )
            attrs["event_types"] = et_cleaned
            attrs["event_type"] = ", ".join(et_cleaned)[:500]

            ol = self.validate_offering_label(
                attrs.get(
                    "offering_label",
                    getattr(inst, "offering_label", "") if inst else None,
                )
            )
            attrs["offering_label"] = ol
            ev_summary = ", ".join(et_cleaned)
            if ol:
                attrs["title"] = f"{ol} — {st} · {ev_summary}"[:200]
            else:
                attrs["title"] = f"{st} · {ev_summary}"[:200]

            prev_tp = (inst.tier_prices if inst else None) or {}
            new_tp = attrs.get("tier_prices", None)
            merged = {**prev_tp, **(new_tp if isinstance(new_tp, dict) else {})}
            for key in TIER_KEYS:
                v = merged.get(key)
                if v is None or str(v).strip() == "":
                    raise serializers.ValidationError(
                        {
                            "tier_prices": "Enter simple, moderate, and luxury per-guest prices "
                            "(all three tiers)."
                        }
                    )
            attrs["tier_prices"] = self.validate_tier_prices(merged)
            merged = attrs["tier_prices"]
            attrs["pricing_unit"] = "per_guest"
            prices_dec = [Decimal(str(merged[k])) for k in TIER_KEYS]
            attrs["price"] = min(prices_dec)
            if "description" in attrs:
                attrs["description"] = str(attrs["description"] or "").strip()
            return attrs

        if request and request.user:
            profile = getattr(request.user, "organizer_profile", None)
            if not profile or not profile.is_approved:
                raise serializers.ValidationError("Organizer is not approved.")
        return attrs
