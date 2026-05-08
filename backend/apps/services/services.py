from django.db.models import Avg, Max, Min

from .models import Service, ServiceCategory


def get_category_price_stats(category: ServiceCategory, tier: str) -> dict:
    stats = Service.objects.filter(category=category, tier=tier).aggregate(
        avg=Avg("price"), min=Min("price"), max=Max("price")
    )
    return {
        "avg": float(stats["avg"] or 0),
        "min": float(stats["min"] or 0),
        "max": float(stats["max"] or 0),
    }
