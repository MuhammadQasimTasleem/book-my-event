import { API_BASE } from "@/lib/config";
import type { AuthTokens, Paginated, UserMe } from "./types";

const ACCESS_KEY = "bme_access";
const REFRESH_KEY = "bme_refresh";
const ACCESS_COOKIE = "bme_access";

const ADMIN_ACCESS_KEY = "bme_admin_access";
const ADMIN_REFRESH_KEY = "bme_admin_refresh";
const ADMIN_ACCESS_COOKIE = "bme_admin_access";

function syncAccessCookie(access: string | null) {
  if (typeof document === "undefined") return;
  if (!access) {
    document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(access)}; Path=/; Max-Age=${30 * 60}; SameSite=Lax`;
}

function syncAdminAccessCookie(access: string | null) {
  if (typeof document === "undefined") return;
  if (!access) {
    document.cookie = `${ADMIN_ACCESS_COOKIE}=; Path=/dashboard/admin; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${ADMIN_ACCESS_COOKIE}=${encodeURIComponent(access)}; Path=/dashboard/admin; Max-Age=${30 * 60}; SameSite=Lax`;
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem(ACCESS_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!access || !refresh) return null;
  return { access, refresh };
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (typeof window === "undefined") return;
  if (!tokens) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    syncAccessCookie(null);
    return;
  }
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
  syncAccessCookie(tokens.access);
}

export function getAdminStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem(ADMIN_ACCESS_KEY);
  const refresh = localStorage.getItem(ADMIN_REFRESH_KEY);
  if (!access || !refresh) return null;
  return { access, refresh };
}

export function setAdminStoredTokens(tokens: AuthTokens | null) {
  if (typeof window === "undefined") return;
  if (!tokens) {
    localStorage.removeItem(ADMIN_ACCESS_KEY);
    localStorage.removeItem(ADMIN_REFRESH_KEY);
    syncAdminAccessCookie(null);
    return;
  }
  localStorage.setItem(ADMIN_ACCESS_KEY, tokens.access);
  localStorage.setItem(ADMIN_REFRESH_KEY, tokens.refresh);
  syncAdminAccessCookie(tokens.access);
}

async function refreshAccess(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh) return null;
  const res = await fetch(`${API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!res.ok) {
    setStoredTokens(null);
    return null;
  }
  const data = (await res.json()) as { access: string; refresh?: string };
  // Backend uses ROTATE_REFRESH_TOKENS; new refresh must be stored or the next refresh 401s.
  setStoredTokens({
    access: data.access,
    refresh: data.refresh ?? tokens.refresh,
  });
  return data.access;
}

async function refreshAdminAccess(): Promise<string | null> {
  const tokens = getAdminStoredTokens();
  if (!tokens?.refresh) return null;
  const res = await fetch(`${API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!res.ok) {
    setAdminStoredTokens(null);
    return null;
  }
  const data = (await res.json()) as { access: string; refresh?: string };
  setAdminStoredTokens({
    access: data.access,
    refresh: data.refresh ?? tokens.refresh,
  });
  return data.access;
}

export type AuthMode = boolean | "admin";

type FetchOpts = RequestInit & { auth?: AuthMode; skipRefresh?: boolean };

function needsAuth(auth: AuthMode | undefined): auth is true | "admin" {
  return auth === true || auth === "admin";
}

function isAdminAuth(auth: AuthMode | undefined): boolean {
  return auth === "admin";
}

export async function apiFetch<T>(
  path: string,
  opts: FetchOpts = {}
): Promise<T> {
  const { auth = false, skipRefresh = false, headers, ...rest } = opts;
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const h = new Headers(headers);
  if (!h.has("Content-Type") && rest.body && typeof rest.body === "string") {
    h.set("Content-Type", "application/json");
  }

  if (needsAuth(auth)) {
    const tokens = isAdminAuth(auth) ? getAdminStoredTokens() : getStoredTokens();
    if (tokens?.access) h.set("Authorization", `Bearer ${tokens.access}`);
  }

  let res = await fetch(url, { ...rest, headers: h });

  if (res.status === 401 && needsAuth(auth) && !skipRefresh) {
    const newAccess = isAdminAuth(auth) ? await refreshAdminAccess() : await refreshAccess();
    if (newAccess) {
      const h2 = new Headers(headers);
      if (!h2.has("Content-Type") && rest.body && typeof rest.body === "string") {
        h2.set("Content-Type", "application/json");
      }
      h2.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(url, { ...rest, headers: h2 });
    }
  }

  if (!res.ok) {
    let detail: unknown = await res.text();
    try {
      detail = JSON.parse(detail as string);
    } catch {
      /* plain text */
    }
    throw Object.assign(new Error(`API ${res.status}`), { status: res.status, detail });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Site session only (clients / organizers). */
export async function loginRequest(email: string, password: string) {
  const data = await apiFetch<AuthTokens & { role: string; email: string }>(
    "/auth/login/",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  setStoredTokens({ access: data.access, refresh: data.refresh });
  return data;
}

/** Admin console session only. */
export async function adminLoginRequest(email: string, password: string) {
  const data = await apiFetch<AuthTokens & { role: string; email: string }>(
    "/auth/login/",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  setAdminStoredTokens({ access: data.access, refresh: data.refresh });
  return data;
}

export async function registerRequest(payload: {
  name: string;
  username: string;
  email: string;
  password: string;
  phone_number?: string;
  role: "client" | "organizer";
}) {
  return apiFetch<{
    message: string;
    /** When true (default flow), user must open the email link before login. */
    requires_verification: boolean;
  }>("/auth/register/", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      phone_number: payload.phone_number ?? "",
    }),
  });
}

export async function fetchMe(): Promise<UserMe> {
  return apiFetch<UserMe>("/users/me/", { auth: true });
}

export async function fetchMeAdmin(): Promise<UserMe> {
  return apiFetch<UserMe>("/users/me/", { auth: "admin" });
}

export async function patchUserMe(
  body: Partial<{
    first_name: string;
    last_name: string;
    phone_number: string;
    username: string;
  }>
) {
  return apiFetch<UserMe>("/users/me/", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(body),
  });
}

export function logout() {
  setStoredTokens(null);
}

export function adminLogout() {
  setAdminStoredTokens(null);
}

export async function fetchServices(
  params: Record<string, string | undefined>,
  opts?: { auth?: AuthMode; pageSize?: number }
) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") q.set(k, v);
  });
  q.set("page_size", String(opts?.pageSize ?? 100));
  return apiFetch<Paginated<import("./types").ServiceApi>>(
    `/services/?${q.toString()}`,
    { auth: opts?.auth ?? false }
  );
}

export async function fetchService(
  id: string | number,
  opts?: { auth?: AuthMode }
) {
  return apiFetch<import("./types").ServiceApi>(`/services/${id}/`, {
    auth: opts?.auth ?? false,
  });
}

export async function fetchCategories() {
  return apiFetch<Paginated<import("./types").ServiceCategoryApi>>(
    "/services/categories/?page_size=500"
  );
}

export async function fetchReviews(revieweeId: number) {
  return apiFetch<Paginated<import("./types").ReviewApi>>(
    `/reviews/?reviewee=${revieweeId}&page_size=100`
  );
}

export async function createReview(body: {
  reviewee: number;
  rating: number;
  comment: string;
}) {
  return apiFetch<import("./types").ReviewApi>("/reviews/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function patchReview(
  id: number,
  body: Partial<{ is_visible: boolean }>,
  opts?: { auth?: AuthMode }
) {
  return apiFetch<import("./types").ReviewApi>(`/reviews/${id}/`, {
    method: "PATCH",
    auth: opts?.auth ?? true,
    body: JSON.stringify(body),
  });
}

export async function fetchBookings(
  params?: Record<string, string>,
  opts?: { auth?: AuthMode }
) {
  const q = new URLSearchParams({ page_size: "100" });
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
  }
  return apiFetch<Paginated<import("./types").BookingApi>>(
    `/bookings/?${q.toString()}`,
    { auth: opts?.auth ?? true }
  );
}

export async function createBooking(body: {
  service?: number;
  package?: number;
  client_event?: number | null;
  event_date: string;
  event_time?: string | null;
  guest_count?: number;
  event_type?: string;
  price_breakdown?: import("./types").BookingPriceLine[];
  total_estimate?: string | number | null;
  notes?: string;
}) {
  return apiFetch<import("./types").BookingApi>("/bookings/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function fetchClientEvents(opts?: { auth?: AuthMode }) {
  const q = new URLSearchParams({ page_size: "100" });
  return apiFetch<Paginated<import("./types").ClientEventApi>>(
    `/bookings/events/?${q.toString()}`,
    { auth: opts?.auth ?? true }
  );
}

export async function createClientEvent(body: { title: string }) {
  return apiFetch<import("./types").ClientEventApi>("/bookings/events/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function patchClientEvent(
  id: number,
  body: Partial<{ title: string }>
) {
  return apiFetch<import("./types").ClientEventApi>(`/bookings/events/${id}/`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function bookingAccept(id: number) {
  return apiFetch<{ message: string }>(`/bookings/${id}/accept/`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({}),
  });
}

export async function bookingReject(id: number) {
  return apiFetch<{ message: string }>(`/bookings/${id}/reject/`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({}),
  });
}

export async function patchBooking(
  id: number,
  body: Partial<{ organizer_notes: string; notes: string }>,
  opts?: { auth?: AuthMode }
) {
  return apiFetch<import("./types").BookingApi>(`/bookings/${id}/`, {
    method: "PATCH",
    auth: opts?.auth ?? true,
    body: JSON.stringify(body),
  });
}

export async function fetchMessages() {
  return apiFetch<Paginated<import("./types").MessageApi>>(
    "/chat/?page_size=200",
    { auth: true }
  );
}

export async function sendMessage(body: { receiver: number; content: string }) {
  return apiFetch<import("./types").MessageApi>("/chat/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function fetchNotifications() {
  return apiFetch<Paginated<import("./types").NotificationApi>>(
    "/notifications/?page_size=50",
    { auth: true }
  );
}

export async function fetchOrganizers(
  params?: Record<string, string | undefined>,
  opts?: { auth?: AuthMode }
) {
  const q = new URLSearchParams({ page_size: "200" });
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, v);
    });
  }
  return apiFetch<Paginated<import("./types").OrganizerProfileApi>>(
    `/organizers/?${q.toString()}`,
    { auth: opts?.auth ?? false }
  );
}

/**
 * Public directory: load every approved organizer (follows pagination until exhausted).
 * Backend caps `page_size` at 100 per request.
 */
export async function fetchAllOrganizers(opts?: { auth?: AuthMode }) {
  const acc: import("./types").OrganizerProfileApi[] = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const res = await fetchOrganizers(
      { page: String(page), page_size: String(pageSize) },
      opts
    );
    acc.push(...res.results);
    if (!res.next || res.results.length === 0) break;
    page += 1;
    if (page > 500) break;
  }
  return acc;
}

export async function fetchOrganizerProfile(
  id: number,
  opts?: { auth?: AuthMode }
) {
  return apiFetch<import("./types").OrganizerProfileApi>(`/organizers/${id}/`, {
    auth: opts?.auth ?? true,
  });
}

/** Public profile row by Django user id (links use `/organizers/{userId}`). */
export async function fetchOrganizerProfileByUserId(
  userId: number,
  opts?: { auth?: AuthMode }
) {
  const r = await fetchOrganizers({ user: String(userId) }, opts);
  const row = r.results[0];
  if (!row) {
    throw Object.assign(new Error("Organizer not found"), { status: 404 });
  }
  return row;
}

export async function patchOrganizerProfile(
  id: number,
  body: Record<string, unknown>,
  opts?: { auth?: AuthMode }
) {
  return apiFetch<import("./types").OrganizerProfileApi>(`/organizers/${id}/`, {
    method: "PATCH",
    auth: opts?.auth ?? true,
    body: JSON.stringify(body),
  });
}

export async function submitOrganizerForApproval() {
  return apiFetch<import("./types").OrganizerProfileApi>(
    "/organizers/submit-for-approval/",
    { method: "POST", auth: true, body: JSON.stringify({}) }
  );
}

export async function fetchAdminUsers(params?: Record<string, string | undefined>) {
  const q = new URLSearchParams({ page_size: "100" });
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, v);
    });
  }
  return apiFetch<Paginated<import("./types").AdminUserApi>>(
    `/admin/users/?${q.toString()}`,
    { auth: "admin" }
  );
}

export async function fetchAdminUser(id: number) {
  return apiFetch<import("./types").AdminUserApi>(`/admin/users/${id}/`, {
    auth: "admin",
  });
}

export async function patchAdminUserActive(id: number, is_active: boolean) {
  return patchAdminUser(id, { is_active });
}

export async function patchAdminUser(
  id: number,
  body: Partial<{
    is_active: boolean;
    is_verified: boolean;
    role: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  }>
) {
  return apiFetch<import("./types").AdminUserApi>(`/admin/users/${id}/`, {
    method: "PATCH",
    auth: "admin",
    body: JSON.stringify(body),
  });
}

export async function deleteAdminUser(id: number) {
  return apiFetch<void>(`/admin/users/${id}/`, {
    method: "DELETE",
    auth: "admin",
  });
}

export async function verifyEmailRequest(token: string) {
  return apiFetch<{ message: string }>("/auth/verify-email/", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationRequest(email: string) {
  return apiFetch<{ message: string }>("/auth/resend-verification/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestPasswordReset(email: string) {
  return apiFetch<{ message: string }>("/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(token: string, new_password: string) {
  return apiFetch<{ message: string }>("/auth/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });
}

export async function markNotificationRead(id: number) {
  return apiFetch<{ ok: boolean }>(`/notifications/${id}/mark-read/`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({}),
  });
}

export async function clientDashboard() {
  return apiFetch<{
    total_bookings: number;
    pending_bookings: number;
    completed_bookings: number;
  }>("/dashboard/client/", { auth: true });
}

export async function organizerDashboard() {
  return apiFetch<{
    total_services: number;
    total_bookings: number;
    pending_bookings: number;
    completed_bookings: number;
    average_rating: number;
  }>("/dashboard/organizer/", { auth: true });
}

export async function adminDashboard() {
  return apiFetch<{
    total_users: number;
    total_clients: number;
    total_organizers: number;
    pending_approvals: number;
    total_bookings: number;
    pending_bookings: number;
    total_services: number;
    total_categories: number;
    total_reviews: number;
    signups_last_7_days: number;
    top_categories: { name: string; bookings: number }[];
  }>("/dashboard/admin/", { auth: "admin" });
}

export async function fetchPendingOrganizers() {
  return apiFetch<import("./types").OrganizerProfileApi[]>(
    "/organizers/pending/",
    { auth: "admin" }
  );
}

export async function approveOrganizer(id: number) {
  return apiFetch<{ message: string }>(`/organizers/${id}/approve/`, {
    method: "POST",
    auth: "admin",
    body: JSON.stringify({}),
  });
}

export async function rejectOrganizer(id: number, reason?: string) {
  return apiFetch<{ message: string }>(`/organizers/${id}/reject/`, {
    method: "POST",
    auth: "admin",
    body: JSON.stringify({ reason: reason ?? "" }),
  });
}

export async function createOrganizerProfile(body: {
  company_name: string;
  description?: string;
}) {
  return apiFetch<import("./types").OrganizerProfileApi>("/organizers/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function createService(body: Record<string, unknown>) {
  return apiFetch<import("./types").ServiceApi>("/services/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

/** Create many services in one request (all succeed or none). */
export async function createServicesBulk(services: Record<string, unknown>[]) {
  return apiFetch<{ results: import("./types").ServiceApi[]; count: number }>(
    "/services/bulk/",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ services }),
    }
  );
}

export async function patchService(
  id: number,
  body: Record<string, unknown>,
  opts?: { auth?: AuthMode }
) {
  return apiFetch<import("./types").ServiceApi>(`/services/${id}/`, {
    method: "PATCH",
    auth: opts?.auth ?? true,
    body: JSON.stringify(body),
  });
}

export async function deleteService(id: number) {
  return apiFetch<void>(`/services/${id}/`, {
    method: "DELETE",
    auth: true,
  });
}

export async function uploadServiceImage(
  serviceId: number,
  image: File,
  opts?: { auth?: AuthMode }
) {
  const form = new FormData();
  form.append("image", image);
  return apiFetch<{ url: string; images: string[] }>(
    `/services/${serviceId}/images/`,
    { method: "POST", auth: opts?.auth ?? true, body: form }
  );
}

export async function deleteServiceImage(
  serviceId: number,
  index: number,
  opts?: { auth?: AuthMode }
) {
  return apiFetch<{ images: string[] }>(
    `/services/${serviceId}/images/${index}/`,
    { method: "DELETE", auth: opts?.auth ?? true }
  );
}

export async function uploadServiceTierImage(
  serviceId: number,
  tier: "normal" | "moderate" | "luxury",
  image: File,
  opts?: { auth?: AuthMode }
) {
  const form = new FormData();
  form.append("image", image);
  return apiFetch<{ url: string; tier_images: Record<string, string> }>(
    `/services/${serviceId}/tier-images/${tier}/`,
    { method: "POST", auth: opts?.auth ?? true, body: form }
  );
}

export async function deleteServiceTierImage(
  serviceId: number,
  tier: "normal" | "moderate" | "luxury",
  opts?: { auth?: AuthMode }
) {
  return apiFetch<{ tier_images: Record<string, string> }>(
    `/services/${serviceId}/tier-images/${tier}/delete/`,
    { method: "DELETE", auth: opts?.auth ?? true }
  );
}

export async function createPackage(body: {
  name: string;
  event_type: string;
  tier: string;
  guest_count: number;
  venue?: string;
  event_date?: string | null;
  notes?: string;
}) {
  return apiFetch<import("./types").EventPackageApi>("/packages/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function createPackageItem(body: {
  package: number;
  service?: number | null;
  category?: number | null;
  tier: string;
  quantity: number;
  notes?: string;
}) {
  return apiFetch<import("./types").PackageItemApi>("/packages/items/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function deletePackageItem(id: number) {
  return apiFetch<void>(`/packages/items/${id}/`, {
    method: "DELETE",
    auth: true,
  });
}

export async function fetchPackages() {
  return apiFetch<Paginated<import("./types").EventPackageApi>>(
    "/packages/?page_size=50",
    { auth: true }
  );
}

export async function patchPackage(
  id: number,
  body: Partial<{
    name: string;
    event_type: string;
    tier: string;
    guest_count: number;
    venue: string;
    event_date: string | null;
    notes: string;
    status: string;
  }>
) {
  return apiFetch<import("./types").EventPackageApi>(`/packages/${id}/`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function budgetEstimate(
  body: {
    package_id?: number;
    items?: { service?: number; category?: number; tier: string; quantity: number }[];
  },
  opts?: { auth?: boolean }
) {
  const useAuth = opts?.auth ?? Boolean(body.package_id);
  return apiFetch<import("./types").BudgetEstimateResponse>("/budget/estimate/", {
    method: "POST",
    auth: useAuth,
    body: JSON.stringify(body),
  });
}

export async function fetchReviewsAdmin() {
  return apiFetch<Paginated<import("./types").ReviewApi>>(
    "/reviews/?page_size=200",
    { auth: "admin" }
  );
}

export async function uploadOrganizerEventPhoto(body: {
  image: File;
  caption?: string;
}) {
  const form = new FormData();
  form.append("image", body.image);
  if (body.caption?.trim()) form.append("caption", body.caption.trim());
  return apiFetch<import("./types").OrganizerEventPhotoApi>(
    "/organizers/event-photos/",
    { method: "POST", auth: true, body: form }
  );
}

export async function deleteOrganizerEventPhoto(id: number) {
  return apiFetch<void>(`/organizers/event-photos/${id}/`, {
    method: "DELETE",
    auth: true,
  });
}

export async function fetchChatMessages(params?: {
  withUserId?: number;
  pageSize?: number;
}) {
  const q = new URLSearchParams();
  if (params?.withUserId != null) q.set("with", String(params.withUserId));
  q.set("page_size", String(params?.pageSize ?? 200));
  const qs = q.toString();
  const data = await apiFetch<
    Paginated<import("./types").MessageApi> | import("./types").MessageApi[]
  >(`/chat/?${qs}`, {
    auth: true,
  });
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    } satisfies Paginated<import("./types").MessageApi>;
  }
  return data;
}

export async function createChatMessage(body: {
  receiver: number;
  content?: string;
  image?: File | null;
}) {
  if (body.image) {
    const form = new FormData();
    form.append("receiver", String(body.receiver));
    const c = (body.content ?? "").trim();
    if (c) form.append("content", c);
    form.append("image", body.image);
    return apiFetch<import("./types").MessageApi>("/chat/", {
      method: "POST",
      auth: true,
      body: form,
    });
  }
  return apiFetch<import("./types").MessageApi>("/chat/", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      receiver: body.receiver,
      content: (body.content ?? "").trim(),
    }),
  });
}

export async function markChatMessagesRead(partnerUserId: number) {
  return apiFetch<{ marked: number }>("/chat/mark-read/", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ partner: partnerUserId }),
  });
}
