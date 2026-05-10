export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? `${API_ORIGIN.replace(/\/$/, "")}/api`;

/** If true, marketing header uses a solid dark bar (no hero photo) for maximum contrast. */
export const HEADER_SOLID =
  process.env.NEXT_PUBLIC_HEADER_SOLID === "1" ||
  process.env.NEXT_PUBLIC_HEADER_SOLID === "true";

/** Django Channels chat consumer (not under /api). */
export function chatWebSocketUrl(accessToken: string): string {
  const origin = API_ORIGIN.replace(/^http/, "ws").replace(/^https/, "wss");
  return `${origin.replace(/\/$/, "")}/ws/chat/?token=${encodeURIComponent(accessToken)}`;
}
