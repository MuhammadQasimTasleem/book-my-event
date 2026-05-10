/** Normalize API error payloads from `apiFetch` into a short user-facing string. */
export function formatApiError(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const anyErr = err as { detail?: unknown };
  const detail = anyErr.detail;

  if (typeof detail === "string") {
    if (detail.startsWith("<") || detail.length > 500) {
      return fallback;
    }
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map(String).join(" ");
  }
  if (detail && typeof detail === "object") {
    const o = detail as Record<string, string[] | string>;
    return Object.entries(o)
      .flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${v}`]
      )
      .join(" ");
  }
  return fallback;
}
