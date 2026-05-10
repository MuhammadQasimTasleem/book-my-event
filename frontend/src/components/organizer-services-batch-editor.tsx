"use client";

import { useState } from "react";
import { createServicesBulk, uploadServiceImage } from "@/lib/api/client";
import { EventTypesMultiField } from "@/components/event-types-multi-field";
import { TagBlock } from "@/components/service-offering-fields";
import { MAX_IMAGES, ServiceImageInput } from "@/components/service-image-input";
import {
  SERVICE_PRESET_OPTIONS,
  type EventPresetKey,
  type ServicePresetKey,
  buildEventTypesList,
  resolveServiceType,
} from "@/lib/service-presets";

const MAX_SERVICE_ROWS = 40;

/** One table row: service type (preset + optional custom) + three tier prices (PKR per guest). */
type PricingRow = {
  id: string;
  servicePreset: ServicePresetKey;
  serviceCustom: string;
  tierSimple: string;
  tierModerate: string;
  tierLuxury: string;
};

type SharedFields = {
  eventPresetKeys: EventPresetKey[];
  customEventTags: string[];
  amenities: string[];
  imageFiles: File[];
  location: string;
  availability: boolean;
};

function newRowId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random()}`;
}

function newPricingRow(
  servicePreset: ServicePresetKey = "food",
  serviceCustom = ""
): PricingRow {
  return {
    id: newRowId(),
    servicePreset,
    serviceCustom,
    tierSimple: "",
    tierModerate: "",
    tierLuxury: "",
  };
}

function initialRows(): PricingRow[] {
  return [newPricingRow("food")];
}

function initialShared(): SharedFields {
  return {
    eventPresetKeys: [],
    customEventTags: [],
    amenities: [],
    imageFiles: [],
    location: "Pakistan",
    availability: true,
  };
}

function rowIsBlank(row: PricingRow): boolean {
  const st = resolveServiceType(row.servicePreset, row.serviceCustom).trim();
  return (
    !st &&
    !row.tierSimple.trim() &&
    !row.tierModerate.trim() &&
    !row.tierLuxury.trim()
  );
}

function validateRow(
  row: PricingRow,
  rowLabel: number,
  eventTypes: string[]
): string | null {
  if (rowIsBlank(row)) return null;
  if (!eventTypes.length) {
    return `Select at least one event type above the table (applies to every filled row).`;
  }
  const st = resolveServiceType(row.servicePreset, row.serviceCustom);
  if (!st.trim()) {
    return `Row ${rowLabel}: choose a service type or enter a name next to Custom….`;
  }
  if (
    !row.tierSimple.trim() ||
    !row.tierModerate.trim() ||
    !row.tierLuxury.trim() ||
    Number(row.tierSimple) < 0 ||
    Number(row.tierModerate) < 0 ||
    Number(row.tierLuxury) < 0
  ) {
    return `Row ${rowLabel} (${st}): enter Simple, Moderate, and Luxury per-guest prices (PKR).`;
  }
  return null;
}

function rowToPayload(
  row: PricingRow,
  shared: SharedFields
): Record<string, unknown> {
  const tier_prices = {
    normal: Number(row.tierSimple),
    moderate: Number(row.tierModerate),
    luxury: Number(row.tierLuxury),
  };
  const base = Math.min(tier_prices.normal, tier_prices.moderate, tier_prices.luxury);
  const event_types = buildEventTypesList(
    shared.eventPresetKeys,
    shared.customEventTags
  );
  const service_type = resolveServiceType(row.servicePreset, row.serviceCustom);
  return {
    offering_label: "",
    service_type,
    category: null,
    tier: "moderate",
    price: base,
    pricing_unit: "per_guest",
    tier_prices,
    included_amenities: shared.amenities,
    event_types,
    location: shared.location.trim() || "Pakistan",
    availability: shared.availability,
    images: [],
    title: "",
    description: "",
  };
}

type Props = { onSaved: () => void };

export function OrganizerServicesBatchEditor({ onSaved }: Props) {
  const [rows, setRows] = useState<PricingRow[]>(initialRows);
  const [shared, setShared] = useState<SharedFields>(initialShared);
  const [newLineCustomName, setNewLineCustomName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setRow = (id: string, patch: Partial<PricingRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const patchShared = (patch: Partial<SharedFields>) => {
    setShared((s) => ({ ...s, ...patch }));
  };

  /** Name filled → new row with Custom… + that name beside the dropdown. Empty → new Food row. */
  const addServiceRow = () => {
    const name = newLineCustomName.trim();
    setRows((prev) => {
      if (prev.length >= MAX_SERVICE_ROWS) return prev;
      if (name) {
        return [...prev, newPricingRow("custom", name)];
      }
      return [...prev, newPricingRow("food")];
    });
    if (name) setNewLineCustomName("");
  };

  const publishAll = async () => {
    setMsg(null);
    setErr(null);
    const eventTypes = buildEventTypesList(
      shared.eventPresetKeys,
      shared.customEventTags
    );
    if (shared.imageFiles.length > MAX_IMAGES) {
      setErr(`At most ${MAX_IMAGES} images per service (choose fewer files).`);
      return;
    }
    const toSubmit = rows.filter((r) => !rowIsBlank(r));
    if (toSubmit.length === 0) {
      setErr(
        "Add at least one service: choose event types, then fill the row with a service type and all three PKR prices (Simple, Moderate, Luxury)."
      );
      return;
    }
    let displayIndex = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rowIsBlank(rows[i])) continue;
      displayIndex += 1;
      const e = validateRow(rows[i], displayIndex, eventTypes);
      if (e) {
        setErr(e);
        return;
      }
    }
    const payloads = toSubmit.map((r) => rowToPayload(r, shared));
    setSaving(true);
    try {
      const { results } = await createServicesBulk(payloads);
      let uploadNote = "";
      for (const id of results.map((r) => r.id)) {
        for (const f of shared.imageFiles) {
          try {
            const buf = await f.arrayBuffer();
            const copy = new File([buf], f.name, { type: f.type });
            await uploadServiceImage(id, copy);
          } catch {
            uploadNote =
              " Some image uploads failed — open a listing from “Your listings” to retry.";
          }
        }
      }
      setRows(initialRows());
      setShared(initialShared());
      setNewLineCustomName("");
      setMsg(
        `Published ${results.length} service${results.length === 1 ? "" : "s"}.${uploadNote}`
      );
      onSaved();
    } catch (ex: unknown) {
      let detail = "Could not publish. Check each row and try again.";
      if (ex && typeof ex === "object" && "detail" in ex) {
        const d = (ex as { detail: unknown }).detail;
        if (typeof d === "string") detail = d;
        else if (Array.isArray(d)) detail = d.map(String).join(" ");
        else if (d && typeof d === "object") {
          const o = d as Record<string, unknown>;
          const first = Object.entries(o)[0];
          if (first) detail = `${first[0]}: ${String(first[1])}`;
        }
      }
      setErr(detail);
    } finally {
      setSaving(false);
    }
  };

  const atRowLimit = rows.length >= MAX_SERVICE_ROWS;

  return (
    <section className="rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
      <h2 className="font-serif text-xl text-espresso-200">Add services</h2>
      <p className="mt-1 text-sm text-muted">
        <strong className="text-espresso-200">One service is enough</strong> to get started — only add
        more rows if you offer additional listings. Each line is one marketplace offering with{" "}
        <strong className="text-espresso-200">three PKR prices per guest</strong> (Simple, Moderate,
        Luxury). Choose event types once; they apply to every row in this publish. Then{" "}
        <strong className="text-espresso-200">Publish all services</strong>.
      </p>

      {err && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </p>
      )}
      {msg && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}

      <div className="mt-6 space-y-6">
        <EventTypesMultiField
          mode="batch"
          selectedPresetKeys={shared.eventPresetKeys}
          onChangePresetKeys={(keys) => patchShared({ eventPresetKeys: keys })}
          customTags={shared.customEventTags}
          onChangeCustomTags={(tags) => patchShared({ customEventTags: tags })}
        />

        <div className="overflow-x-auto rounded-xl border border-espresso-200/15 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-espresso-200/15 bg-cream-50/90">
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500"
                >
                  Service type
                </th>
                <th
                  scope="col"
                  className="border-l border-espresso-200/10 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500"
                >
                  Simple
                </th>
                <th
                  scope="col"
                  className="border-l border-espresso-200/10 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500"
                >
                  Moderate
                </th>
                <th
                  scope="col"
                  className="border-l border-espresso-200/10 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500"
                >
                  Luxury
                </th>
              </tr>
              <tr className="border-b border-espresso-200/12 bg-cream-50/40">
                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="sr-only" htmlFor="batch-new-service-name">
                      Optional name for new line
                    </label>
                    <input
                      id="batch-new-service-name"
                      className="input normal-case min-w-0 flex-1 text-sm"
                      value={newLineCustomName}
                      onChange={(e) => setNewLineCustomName(e.target.value)}
                      placeholder="Optional: name for new line…"
                      maxLength={120}
                      disabled={atRowLimit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!atRowLimit) addServiceRow();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={atRowLimit}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-gold-400/55 bg-gold-300/25 px-5 text-xs font-semibold uppercase tracking-[0.12em] text-espresso-200 transition hover:bg-gold-300/40 disabled:opacity-50"
                      onClick={addServiceRow}
                    >
                      Add another
                    </button>
                  </div>
                  {atRowLimit ? (
                    <p className="mt-2 text-[11px] leading-snug text-rose-700">
                      Max {MAX_SERVICE_ROWS} lines per publish. Publish in two batches if you need more.
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      <strong className="font-medium text-espresso-200/90">Add</strong> appends a row. If you type a name
                      first, the new row uses <strong className="text-espresso-200/90">Custom…</strong> with that name
                      beside the dropdown. If you leave it empty, the new row defaults to{" "}
                      <strong className="text-espresso-200/90">Food</strong> (change it in the dropdown). On any row,
                      choose <strong className="text-espresso-200/90">Custom…</strong> to type a name next to the
                      dropdown.
                    </p>
                  )}
                </td>
                <td colSpan={3} className="border-l border-espresso-200/10 bg-cream-50/20" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-espresso-200/[0.1] last:border-b-0 hover:bg-cream-50/50"
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`svc-${row.id}`}>
                        Service type row {idx + 1}
                      </label>
                      <select
                        id={`svc-${row.id}`}
                        className="input normal-case min-w-[8.5rem] shrink-0"
                        value={row.servicePreset}
                        onChange={(e) => {
                          const v = e.target.value as ServicePresetKey;
                          setRow(row.id, {
                            servicePreset: v,
                            serviceCustom: v === "custom" ? row.serviceCustom : "",
                          });
                        }}
                      >
                        {SERVICE_PRESET_OPTIONS.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {row.servicePreset === "custom" ? (
                        <input
                          className="input normal-case min-w-[8rem] flex-1"
                          placeholder="Service name"
                          value={row.serviceCustom}
                          onChange={(e) =>
                            setRow(row.id, { serviceCustom: e.target.value })
                          }
                          maxLength={120}
                          aria-label={`Custom service name row ${idx + 1}`}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="border-l border-espresso-200/10 px-4 py-3 align-middle">
                    <label className="sr-only" htmlFor={`simple-${row.id}`}>
                      Simple PKR row {idx + 1}
                    </label>
                    <input
                      id={`simple-${row.id}`}
                      className="input normal-case w-full min-w-0 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="PKR"
                      value={row.tierSimple}
                      onChange={(e) => setRow(row.id, { tierSimple: e.target.value })}
                    />
                  </td>
                  <td className="border-l border-espresso-200/10 px-4 py-3 align-middle">
                    <label className="sr-only" htmlFor={`mod-${row.id}`}>
                      Moderate PKR row {idx + 1}
                    </label>
                    <input
                      id={`mod-${row.id}`}
                      className="input normal-case w-full min-w-0 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="PKR"
                      value={row.tierModerate}
                      onChange={(e) => setRow(row.id, { tierModerate: e.target.value })}
                    />
                  </td>
                  <td className="border-l border-espresso-200/10 px-4 py-3 align-middle">
                    <label className="sr-only" htmlFor={`lux-${row.id}`}>
                      Luxury PKR row {idx + 1}
                    </label>
                    <input
                      id={`lux-${row.id}`}
                      className="input normal-case w-full min-w-0 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="PKR"
                      value={row.tierLuxury}
                      onChange={(e) => setRow(row.id, { tierLuxury: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TagBlock
          label="Optional amenities (apply to every published line)"
          placeholder="Enter to add"
          tags={shared.amenities}
          onChange={(tags) => patchShared({ amenities: tags })}
        />

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Location
          <input
            className="input normal-case"
            value={shared.location}
            onChange={(e) => patchShared({ location: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-espresso-200">
          <input
            type="checkbox"
            checked={shared.availability}
            onChange={(e) => patchShared({ availability: e.target.checked })}
          />
          Available for booking
        </label>

        <ServiceImageInput
          imageFiles={shared.imageFiles}
          onImageFilesChange={(files) => patchShared({ imageFiles: files })}
        />
      </div>

      <div className="mt-6">
        <button
          type="button"
          disabled={saving}
          className="btn-primary"
          onClick={() => void publishAll()}
        >
          {saving ? "Publishing…" : "Publish all services"}
        </button>
      </div>
    </section>
  );
}
