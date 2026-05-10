"""Tier matrix helpers for service unit prices (min/max for listings)."""

from decimal import Decimal

from .models import Service

TIER_KEYS = frozenset(
    {Service.Tier.NORMAL, Service.Tier.MODERATE, Service.Tier.LUXURY}
)


def tier_unit_price_bounds(service: Service) -> tuple[Decimal, Decimal]:
    """Return (min, max) unit price across normal / moderate / luxury for this service."""
    base = Decimal(str(service.price))
    raw = getattr(service, "tier_prices", None) or {}
    if not isinstance(raw, dict):
        raw = {}
    values: list[Decimal] = []
    for key in TIER_KEYS:
        v = raw.get(key)
        if v is not None and v != "":
            values.append(Decimal(str(v)))
        else:
            values.append(base)
    if not values:
        values = [base]
    return min(values), max(values)
