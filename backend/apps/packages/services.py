from decimal import Decimal
from typing import Iterable

from django.db import transaction

from apps.services.models import Service
from apps.services.pricing import TIER_KEYS
from apps.services.services import get_category_price_stats
from .models import EventPackage, PackageItem


def _build_suggestion(items_breakdown: list[dict]) -> list[str]:
    suggestions = []
    tiers = {item["tier"] for item in items_breakdown}
    if "luxury" in tiers:
        suggestions.append("Switch luxury items to moderate tier to reduce cost.")
    if any(item.get("unavailable") for item in items_breakdown):
        suggestions.append(
            "Some selections are unavailable or have no rate for this tier — "
            "they are excluded from the total; pick another listing or organizer."
        )
    if any(
        not item.get("unavailable") and item.get("min_price", 0) == 0
        for item in items_breakdown
    ):
        suggestions.append("Add more services to generate a reliable estimate.")
    return suggestions


def _organizer_labels(service: Service) -> tuple[int, str, str]:
    org = service.organizer
    oid = org.pk
    person = (f"{org.first_name} {org.last_name}".strip()) or org.username or org.email or ""
    company = person
    prof = getattr(org, "organizer_profile", None)
    if prof is not None:
        cn = (prof.company_name or "").strip()
        if cn:
            company = cn
    return oid, person, company


def estimate_items(items: Iterable[dict]) -> dict:
    items_list = list(items)
    service_ids = [
        item["service"].pk for item in items_list if item.get("service") is not None
    ]
    enriched_by_id: dict[int, Service] = {}
    if service_ids:
        enriched_by_id = {
            s.id: s
            for s in Service.objects.filter(pk__in=service_ids).select_related(
                "organizer",
                "organizer__organizer_profile",
                "category",
            )
        }

    breakdown = []
    total = 0.0
    min_total = 0.0
    max_total = 0.0

    for item in items_list:
        raw_svc = item.get("service")
        service = enriched_by_id.get(raw_svc.pk, raw_svc) if raw_svc else None
        category = item.get("category")
        tier = item.get("tier")
        quantity = int(item.get("quantity", 1))

        if service:
            tp = getattr(service, "tier_prices", None) or {}
            t = str(tier or Service.Tier.MODERATE)
            if t not in TIER_KEYS:
                t = Service.Tier.MODERATE
            raw_p = tp.get(t)
            unit_dec = Decimal(str(raw_p if raw_p not in (None, "") else service.price))
            unit_float = float(unit_dec)
            pricing_missing = unit_float <= 0
            organizer_unavailable = not bool(getattr(service, "availability", True))
            line_unavailable = organizer_unavailable or pricing_missing

            title = service.listing_title()
            st = (getattr(service, "service_type", None) or "").strip()
            category_name = st or (
                service.category.name if service.category else "Service"
            )

            if line_unavailable:
                price = 0.0
                min_price = 0.0
                max_price = 0.0
                unavailable_reason = "not_offered" if organizer_unavailable else "no_rate"
            else:
                price = unit_float * quantity
                unavailable_reason = None
                # Market range: other organizers listing the same category + pricing unit.
                if service.category_id:
                    peer_qs = Service.objects.filter(
                        category_id=service.category_id,
                        pricing_unit=service.pricing_unit,
                        availability=True,
                    )
                else:
                    peer_qs = Service.objects.filter(pk=service.pk)
                line_amounts: list[float] = []
                for p in peer_qs:
                    ptp = getattr(p, "tier_prices", None) or {}
                    praw = ptp.get(t)
                    punit = Decimal(str(praw if praw not in (None, "") else p.price))
                    line_amounts.append(float(punit) * quantity)
                if not line_amounts:
                    line_amounts = [price]
                min_price = min(line_amounts)
                max_price = max(line_amounts)
        else:
            stats = get_category_price_stats(category, tier)
            price = stats["avg"] * quantity
            min_price = stats["min"] * quantity
            max_price = stats["max"] * quantity
            title = category.name
            category_name = category.name

        row = {
            "title": title,
            "category": category_name,
            "tier": tier,
            "quantity": quantity,
            "estimated_price": round(price, 2),
            "min_price": round(min_price, 2),
            "max_price": round(max_price, 2),
            "unavailable": line_unavailable if service else False,
        }
        if service:
            oid, oname, ocompany = _organizer_labels(service)
            row["service_id"] = service.pk
            row["organizer_id"] = oid
            row["organizer_name"] = oname
            row["organizer_company"] = ocompany
        if service and line_unavailable:
            row["unavailable_reason"] = unavailable_reason
        breakdown.append(row)
        total += price
        min_total += min_price
        max_total += max_price

    suggestions = _build_suggestion(breakdown)
    if any(
        item.get("min_price", 0) < item.get("max_price", 0) - 0.01 for item in breakdown
    ):
        suggestions.append(
            "Line ranges show low–high across organizers in the same category for your tier."
        )

    return {
        "total": round(total, 2),
        "min_total": round(min_total, 2),
        "max_total": round(max_total, 2),
        "breakdown": breakdown,
        "suggestions": suggestions,
    }


def estimate_package_budget(package: EventPackage) -> dict:
    items = []
    for item in package.items.select_related("service", "category"):
        items.append(
            {
                "service": item.service,
                "category": item.category,
                "tier": item.tier,
                "quantity": item.quantity,
            }
        )
    return estimate_items(items)


def update_package_estimate(package: EventPackage) -> EventPackage:
    summary = estimate_package_budget(package)
    package.estimated_total = summary["total"]
    package.estimated_min = summary["min_total"]
    package.estimated_max = summary["max_total"]
    package.breakdown = {
        "items": summary["breakdown"],
        "suggestions": summary["suggestions"],
    }
    package.save(update_fields=["estimated_total", "estimated_min", "estimated_max", "breakdown"])
    return package
