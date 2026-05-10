import type { UserMe, UserRole } from "@/lib/api/types";

/** Normalize API role so comparisons are reliable (case, whitespace). */
export function normalizeUserRole(role: unknown): UserRole | null {
  const r = String(role ?? "")
    .toLowerCase()
    .trim();
  if (r === "client" || r === "organizer" || r === "admin") return r;
  return null;
}

export function normalizeUserMe(me: UserMe): UserMe {
  const r = normalizeUserRole(me.role);
  if (r) return { ...me, role: r };
  return me;
}

export function isClientUser(user: UserMe | null | undefined): boolean {
  return normalizeUserRole(user?.role) === "client";
}

export function isOrganizerUser(user: UserMe | null | undefined): boolean {
  return normalizeUserRole(user?.role) === "organizer";
}
