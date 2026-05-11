import type { ServiceApi } from "@/lib/api/types";

export type EventCartTier = "normal" | "moderate" | "luxury";

export type EventCartLine = {
  serviceId: number;
  organizerUserId: number;
  organizerName: string;
  companyName: string;
  listingTitle: string;
  pricingUnit: "per_event" | "per_guest";
  tier: EventCartTier;
  tierPrices: Record<EventCartTier, number>;
};

export function snapshotTierPrices(s: ServiceApi): Record<EventCartTier, number> {
  const tp = s.tier_prices ?? {};
  const fallback = Number(s.price);
  const one = (key: EventCartTier): number => {
    const raw = tp[key];
    if (raw != null && String(raw).trim() !== "") {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return Number.isFinite(fallback) ? fallback : 0;
  };
  return {
    normal: one("normal"),
    moderate: one("moderate"),
    luxury: one("luxury"),
  };
}

export function unitPriceForTier(line: EventCartLine): number {
  const u = line.tierPrices[line.tier];
  return Number.isFinite(u) ? u : line.tierPrices.moderate;
}

export function lineSubtotal(line: EventCartLine, guestCount: number): number {
  const unit = unitPriceForTier(line);
  const q = line.pricingUnit === "per_guest" ? Math.max(1, guestCount) : 1;
  return unit * q;
}

export function buildEventCartLine(
  s: ServiceApi,
  tier: EventCartTier,
  companyName: string,
  listingTitle: string
): EventCartLine {
  return {
    serviceId: s.id,
    organizerUserId: s.organizer,
    organizerName: s.organizer_name,
    companyName: companyName.trim() || s.organizer_name,
    listingTitle,
    pricingUnit: s.pricing_unit === "per_guest" ? "per_guest" : "per_event",
    tier,
    tierPrices: snapshotTierPrices(s),
  };
}

export const EVENT_CART_STORAGE_KEY = "bme_event_cart_v1";

export const TIER_LABELS: Record<EventCartTier, string> = {
  normal: "Simple",
  moderate: "Moderate",
  luxury: "Luxury",
};
