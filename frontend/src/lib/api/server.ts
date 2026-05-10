import { API_BASE } from "@/lib/config";
import type {
  OrganizerProfileApi,
  Paginated,
  ServiceApi,
  ServiceCategoryApi,
} from "./types";

export async function serverFetch<T>(path: string): Promise<T | null> {
  try {
    const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<ServiceCategoryApi[]> {
  const data = await serverFetch<Paginated<ServiceCategoryApi>>(
    "/services/categories/?page_size=100"
  );
  return data?.results ?? [];
}

export async function getServices(q: Record<string, string | undefined>) {
  const params = new URLSearchParams({ page_size: "100" });
  Object.entries(q).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const data = await serverFetch<Paginated<ServiceApi>>(
    `/services/?${params.toString()}`
  );
  return data?.results ?? [];
}

export async function getService(id: string) {
  return serverFetch<ServiceApi>(`/services/${id}/`);
}

export async function getReviewsForOrganizer(organizerId: number) {
  const data = await serverFetch<Paginated<import("./types").ReviewApi>>(
    `/reviews/?reviewee=${organizerId}&page_size=100`
  );
  return data?.results ?? [];
}

export type OrganizersResult =
  | { ok: true; results: OrganizerProfileApi[] }
  | { ok: false; results: OrganizerProfileApi[] };

export async function getOrganizers(
  q?: Record<string, string | undefined>
): Promise<OrganizersResult> {
  const params = new URLSearchParams({ page_size: "100" });
  if (q) {
    Object.entries(q).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const data = await serverFetch<Paginated<OrganizerProfileApi>>(
    `/organizers/?${params.toString()}`
  );
  if (data === null) {
    return { ok: false, results: [] };
  }
  return { ok: true, results: data.results };
}

export async function getOrganizerProfileByUserId(userId: string) {
  const { results } = await getOrganizers({ user: userId });
  return results[0] ?? null;
}

export async function getServicesForOrganizer(organizerUserId: string) {
  const params = new URLSearchParams({
    page_size: "100",
    organizer: organizerUserId,
  });
  const data = await serverFetch<Paginated<ServiceApi>>(
    `/services/?${params.toString()}`
  );
  return data?.results ?? [];
}
