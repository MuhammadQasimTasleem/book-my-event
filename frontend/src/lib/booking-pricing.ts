import type { ServiceApi } from "@/lib/api/types";

export type TierKey = "normal" | "moderate" | "luxury";

export function unitPriceForServiceTier(s: ServiceApi, tier: TierKey): number {
  const tp = s.tier_prices ?? {};
  const raw = tp[tier];
  if (raw != null && String(raw).trim() !== "") return Number(raw);
  return Number(s.price);
}

export function quantityForService(s: ServiceApi, guests: number): number {
  return (s.pricing_unit ?? "per_event") === "per_guest"
    ? Math.max(1, guests)
    : 1;
}

export function lineTotalForService(
  s: ServiceApi,
  tier: TierKey,
  guests: number
): number {
  const unit = unitPriceForServiceTier(s, tier);
  const qty = quantityForService(s, guests);
  return unit * qty;
}
