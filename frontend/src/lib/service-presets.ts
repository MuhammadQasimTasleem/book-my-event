/** Preset keys sent to the UI; resolved labels are posted as `event_type` / `service_type`. */

export const EVENT_PRESET_OPTIONS = [
  { key: "birthday", label: "Birthday" },
  { key: "wedding", label: "Wedding" },
  { key: "walima", label: "Walima" },
  { key: "corporate_event", label: "Corporate event" },
  { key: "custom", label: "Custom…" },
] as const;

export const SERVICE_PRESET_OPTIONS = [
  { key: "food", label: "Food" },
  { key: "catering", label: "Catering" },
  { key: "decoration", label: "Decoration" },
  { key: "music", label: "Music" },
  { key: "custom", label: "Custom…" },
] as const;

export type EventPresetKey = (typeof EVENT_PRESET_OPTIONS)[number]["key"];
export type ServicePresetKey = (typeof SERVICE_PRESET_OPTIONS)[number]["key"];

/** Presets shown as checkboxes (multi-select); “Custom…” is only via tags. */
export const EVENT_MULTI_PRESETS = EVENT_PRESET_OPTIONS.filter(
  (o) => o.key !== "custom"
);

const EVENT_LABEL_BY_KEY: Record<EventPresetKey, string> = Object.fromEntries(
  EVENT_PRESET_OPTIONS.map((o) => [o.key, o.label])
) as Record<EventPresetKey, string>;

const SERVICE_LABEL_BY_KEY: Record<ServicePresetKey, string> = Object.fromEntries(
  SERVICE_PRESET_OPTIONS.map((o) => [o.key, o.label])
) as Record<ServicePresetKey, string>;

export function resolveEventType(preset: EventPresetKey, custom: string): string {
  if (preset === "custom") return custom.trim();
  return EVENT_LABEL_BY_KEY[preset];
}

export function resolveServiceType(preset: ServicePresetKey, custom: string): string {
  if (preset === "custom") return custom.trim();
  return SERVICE_LABEL_BY_KEY[preset];
}

export function parseStoredEventType(stored: string): {
  preset: EventPresetKey;
  custom: string;
} {
  const t = (stored || "").trim();
  if (!t) return { preset: "birthday", custom: "" };
  const match = EVENT_PRESET_OPTIONS.find(
    (o) => o.key !== "custom" && o.label.toLowerCase() === t.toLowerCase()
  );
  if (match) return { preset: match.key, custom: "" };
  return { preset: "custom", custom: t };
}

const LABEL_TO_EVENT_PRESET_KEY = new Map(
  EVENT_MULTI_PRESETS.map((o) => [o.label.toLowerCase(), o.key])
);

/** Build API `event_types` from checkbox keys + custom tag strings (deduped). */
export function buildEventTypesList(
  selectedPresetKeys: EventPresetKey[],
  customTags: string[]
): string[] {
  const fromKeys = selectedPresetKeys
    .filter((k) => k !== "custom")
    .map((k) => EVENT_LABEL_BY_KEY[k]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...fromKeys, ...customTags]) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Load editor state from API (prefers `event_types`, falls back to legacy `event_type`). */
export function parseEventTypesFromService(s: {
  event_types?: string[];
  event_type?: string;
}): { presetKeys: EventPresetKey[]; customTags: string[] } {
  let list = s.event_types?.length ? [...s.event_types] : [];
  if (!list.length && (s.event_type || "").trim()) {
    list = (s.event_type || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  const presetKeys: EventPresetKey[] = [];
  const customTags: string[] = [];
  const seenPreset = new Set<string>();
  for (const item of list) {
    const t = item.trim();
    if (!t) continue;
    const pk = LABEL_TO_EVENT_PRESET_KEY.get(t.toLowerCase());
    if (pk && !seenPreset.has(pk)) {
      seenPreset.add(pk);
      presetKeys.push(pk);
    } else if (!pk) {
      const low = t.toLowerCase();
      if (!customTags.some((c) => c.toLowerCase() === low)) customTags.push(t);
    }
  }
  return { presetKeys, customTags };
}

export function parseStoredServiceType(stored: string): {
  preset: ServicePresetKey;
  custom: string;
} {
  const t = (stored || "").trim();
  if (!t) return { preset: "catering", custom: "" };
  const match = SERVICE_PRESET_OPTIONS.find(
    (o) => o.key !== "custom" && o.label.toLowerCase() === t.toLowerCase()
  );
  if (match) return { preset: match.key, custom: "" };
  return { preset: "custom", custom: t };
}

export function serviceListingLabel(row: {
  offering_label?: string;
  service_type?: string;
  event_type?: string;
  event_types?: string[];
  title?: string;
}): string {
  const label = (row.offering_label || "").trim();
  const a = (row.service_type || "").trim();
  const ev =
    row.event_types?.filter(Boolean).join(", ") || (row.event_type || "").trim();
  const core =
    a && ev ? `${a} · ${ev}` : (row.title || "").trim() || a || ev;
  if (label && core) return `${label} — ${core}`;
  if (label) return label;
  if (core) return core;
  return "Service";
}
