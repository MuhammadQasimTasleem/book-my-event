from typing import Iterable

from django.db import transaction

from apps.services.models import Service
from apps.services.services import get_category_price_stats
from .models import EventPackage, PackageItem


def _build_suggestion(items_breakdown: list[dict]) -> list[str]:
    suggestions = []
    tiers = {item["tier"] for item in items_breakdown}
    if "luxury" in tiers:
        suggestions.append("Switch luxury items to moderate tier to reduce cost.")
    if any(item["min_price"] == 0 for item in items_breakdown):
        suggestions.append("Add more services to generate a reliable estimate.")
    return suggestions


def estimate_items(items: Iterable[dict]) -> dict:
    breakdown = []
    total = 0.0
    min_total = 0.0
    max_total = 0.0

    for item in items:
        service = item.get("service")
        category = item.get("category")
        tier = item.get("tier")
        quantity = int(item.get("quantity", 1))

        if service:
            price = float(service.price) * quantity
            min_price = price
            max_price = price
            title = service.title
            category_name = service.category.name
        else:
            stats = get_category_price_stats(category, tier)
            price = stats["avg"] * quantity
            min_price = stats["min"] * quantity
            max_price = stats["max"] * quantity
            title = category.name
            category_name = category.name

        breakdown.append(
            {
                "title": title,
                "category": category_name,
                "tier": tier,
                "quantity": quantity,
                "estimated_price": round(price, 2),
                "min_price": round(min_price, 2),
                "max_price": round(max_price, 2),
            }
        )
        total += price
        min_total += min_price
        max_total += max_price

    suggestions = _build_suggestion(breakdown)

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
