import { API_ORIGIN } from "@/lib/config";
import type { ServiceApi } from "@/lib/api/types";
import type { Service } from "@/lib/data";
import { serviceListingLabel } from "@/lib/service-presets";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80";

function mediaUrl(path: string | null | undefined): string {
  if (!path) return PLACEHOLDER;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = API_ORIGIN.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Reject gallery/search page URLs organizers sometimes paste (not direct image files). */
function directImageOrPlaceholder(absoluteUrl: string): string {
  try {
    const u = new URL(absoluteUrl);
    const host = u.hostname.toLowerCase();
    const p = u.pathname.toLowerCase();
    if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(p)) return absoluteUrl;
    if (p.includes("/media/")) return absoluteUrl;
    if (host.includes("unsplash.com")) return absoluteUrl;
    if (host.includes("googleusercontent.com") || host.includes("gstatic.com")) {
      return absoluteUrl;
    }
    if (host === "localhost" || host.startsWith("127.")) return absoluteUrl;
    if (host.includes("istockphoto.com") && p.includes("/photos/")) {
      return PLACEHOLDER;
    }
    if (host.includes("shutterstock.com") && p.includes("/search")) {
      return PLACEHOLDER;
    }
    return absoluteUrl;
  } catch {
    return PLACEHOLDER;
  }
}

export function mapServiceApiToCard(row: ServiceApi): Service {
  const price = Number(row.price);
  const rating = Number(row.rating);
  const img = row.primary_image || row.images?.[0];
  const unit: Service["unit"] =
    row.pricing_unit === "per_guest" ? "per head" : "per event";
  const imageAbs = mediaUrl(img);
  const image = directImageOrPlaceholder(imageAbs);

  return {
    id: String(row.id),
    name: serviceListingLabel(row),
    category: row.category_slug || slugifyFallback(row.service_type),
    organizer: row.organizer_name,
    organizerId: String(row.organizer),
    city: row.location,
    rating: Number.isFinite(rating) ? rating : 0,
    reviews: row.review_count ?? 0,
    priceFrom: Number.isFinite(price) ? price : 0,
    unit,
    image,
    tags: [row.service_type, row.event_type, row.tier].filter(Boolean) as string[],
    description: row.description,
  };
}

function slugifyFallback(s: string | undefined): string {
  if (!s?.trim()) return "service";
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
