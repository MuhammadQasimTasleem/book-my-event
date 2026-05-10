"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteServiceImage,
  fetchCategories,
  fetchService,
  patchService,
  uploadServiceImage,
} from "@/lib/api/client";
import type { ServiceApi, ServiceCategoryApi } from "@/lib/api/types";
import { EventTypesMultiField } from "@/components/event-types-multi-field";
import { TagBlock } from "@/components/service-offering-fields";
import { MAX_IMAGES, ServiceImageInput } from "@/components/service-image-input";
import { useAuth } from "@/components/providers";
import {
  SERVICE_PRESET_OPTIONS,
  type EventPresetKey,
  type ServicePresetKey,
  buildEventTypesList,
  parseEventTypesFromService,
  parseStoredServiceType,
  resolveServiceType,
} from "@/lib/service-presets";

const TIERS = ["normal", "moderate", "luxury"] as const;

export default function AdminServiceEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { adminUser, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<ServiceCategoryApi[]>([]);
  const [row, setRow] = useState<ServiceApi | null>(null);
  const [offeringLabel, setOfferingLabel] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [eventPresetKeys, setEventPresetKeys] = useState<EventPresetKey[]>([]);
  const [customEventTags, setCustomEventTags] = useState<string[]>([]);
  const [servicePreset, setServicePreset] = useState<ServicePresetKey>("catering");
  const [serviceCustom, setServiceCustom] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("moderate");
  const [price, setPrice] = useState("");
  const [pricingUnit, setPricingUnit] = useState<"per_event" | "per_guest">(
    "per_guest"
  );
  const [tierNormal, setTierNormal] = useState("");
  const [tierModerate, setTierModerate] = useState("");
  const [tierLuxury, setTierLuxury] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [availability, setAvailability] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser || adminUser.role !== "admin") {
      router.replace("/dashboard/admin/login");
      return;
    }
    void fetchCategories()
      .then((c) => setCategories(c.results.filter((x) => x.is_active)))
      .catch(() => {});
  }, [adminUser, authLoading, router]);

  useEffect(() => {
    if (authLoading || !adminUser || adminUser.role !== "admin") return;
    if (!Number.isFinite(id)) return;
    void fetchService(id, { auth: "admin" })
      .then((s) => {
        setRow(s);
        setOfferingLabel(s.offering_label ?? "");
        setTitle(s.title || "");
        setDescription(s.description || "");
        setCategoryId(s.category ?? "");
        const ev = parseEventTypesFromService(s);
        setEventPresetKeys(ev.presetKeys);
        setCustomEventTags(ev.customTags);
        const sv = parseStoredServiceType(s.service_type || "");
        setServicePreset(sv.preset);
        setServiceCustom(sv.custom);
        setTier(
          (TIERS.includes(s.tier as (typeof TIERS)[number])
            ? s.tier
            : "moderate") as (typeof TIERS)[number]
        );
        setPrice(String(s.price));
        setPricingUnit(s.pricing_unit === "per_guest" ? "per_guest" : "per_event");
        const tp = s.tier_prices ?? {};
        setTierNormal(tp.normal != null ? String(tp.normal) : "");
        setTierModerate(tp.moderate != null ? String(tp.moderate) : "");
        setTierLuxury(tp.luxury != null ? String(tp.luxury) : "");
        setAmenities(
          Array.isArray(s.included_amenities) ? [...s.included_amenities] : []
        );
        setLocation(s.location);
        setAvailability(s.availability);
        setImageFiles([]);
      })
      .catch(() => setErr("Could not load service."));
  }, [adminUser, authLoading, router, id]);

  const buildTierPrices = (): Record<string, number> => {
    const out: Record<string, number> = {};
    if (tierNormal.trim()) out.normal = Number(tierNormal);
    if (tierModerate.trim()) out.moderate = Number(tierModerate);
    if (tierLuxury.trim()) out.luxury = Number(tierLuxury);
    return out;
  };

  const save = async () => {
    setMsg(null);
    setErr(null);
    if (!row) return;
    const existingCount = row.images?.length ?? 0;
    if (existingCount + imageFiles.length > MAX_IMAGES) {
      setErr(`At most ${MAX_IMAGES} images total. Remove some or upload fewer files.`);
      return;
    }
    setSaving(true);
    try {
      const event_types = buildEventTypesList(eventPresetKeys, customEventTags);
      const serviceType = resolveServiceType(servicePreset, serviceCustom);
      const evSummary = event_types.join(", ");
      const tier_prices = buildTierPrices();
      const payload: Record<string, unknown> = {
        offering_label: offeringLabel.trim(),
        title: title.trim() || `${serviceType} · ${evSummary}`.slice(0, 200),
        description: description.trim(),
        category: categoryId === "" ? null : categoryId,
        event_types,
        event_type: evSummary.slice(0, 500),
        service_type: serviceType,
        tier,
        price: Number(price) || 0,
        pricing_unit: pricingUnit,
        tier_prices,
        included_amenities: amenities,
        location: location.trim() || "Pakistan",
        availability,
        images: [...(row.images ?? [])],
      };
      let uploadNote = "";
      const s = await patchService(id, payload, { auth: "admin" });
      for (const f of imageFiles) {
        try {
          await uploadServiceImage(s.id, f, { auth: "admin" });
        } catch {
          uploadNote =
            " Saved; one or more uploads failed — try again or remove images to stay under the limit.";
        }
      }
      const refreshed = await fetchService(id, { auth: "admin" });
      setRow(refreshed);
      setAmenities(
        Array.isArray(refreshed.included_amenities)
          ? [...refreshed.included_amenities]
          : []
      );
      setImageFiles([]);
      setMsg(uploadNote ? `Saved.${uploadNote}` : "Saved.");
    } catch {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !adminUser || adminUser.role !== "admin") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  if (!row && !err) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/admin/services"
        className="text-sm text-gold-400 hover:underline"
      >
        ← All services
      </Link>
      <h1 className="font-serif text-3xl text-espresso-200">Edit service</h1>
      {err && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}
      <div className="space-y-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
        <p className="text-xs text-muted">
          Service #{row?.id} · Organizer user #{row?.organizer} ({row?.organizer_name})
        </p>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Optional listing label (duplicate service types)
          <input
            className="input normal-case"
            value={offeringLabel}
            onChange={(e) => setOfferingLabel(e.target.value)}
            maxLength={120}
          />
        </label>

        <EventTypesMultiField
          selectedPresetKeys={eventPresetKeys}
          onChangePresetKeys={setEventPresetKeys}
          customTags={customEventTags}
          onChangeCustomTags={setCustomEventTags}
        />

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Service type
          <select
            className="input normal-case"
            value={servicePreset}
            onChange={(e) =>
              setServicePreset(e.target.value as ServicePresetKey)
            }
          >
            {SERVICE_PRESET_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {servicePreset === "custom" ? (
            <input
              className="input normal-case mt-2"
              value={serviceCustom}
              onChange={(e) => setServiceCustom(e.target.value)}
            />
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Legacy category (optional)
          <select
            className="input normal-case"
            value={categoryId === "" ? "" : String(categoryId)}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Listing title override (optional)
          <input
            className="input normal-case"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Description (optional)
          <textarea
            className="input min-h-[80px] normal-case"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Tier tag
          <select
            className="input normal-case"
            value={tier}
            onChange={(e) =>
              setTier(e.target.value as (typeof TIERS)[number])
            }
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Base / fallback price (PKR)
          <input
            className="input normal-case"
            type="number"
            min={0}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Pricing unit
          <select
            className="input normal-case"
            value={pricingUnit}
            onChange={(e) =>
              setPricingUnit(
                e.target.value === "per_guest" ? "per_guest" : "per_event"
              )
            }
          >
            <option value="per_event">Per event</option>
            <option value="per_guest">Per guest</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
            Tier · simple (normal)
            <input
              className="input normal-case"
              type="number"
              min={0}
              step="1"
              value={tierNormal}
              onChange={(e) => setTierNormal(e.target.value)}
              placeholder="—"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
            Tier · moderate
            <input
              className="input normal-case"
              type="number"
              min={0}
              step="1"
              value={tierModerate}
              onChange={(e) => setTierModerate(e.target.value)}
              placeholder="—"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
            Tier · luxury
            <input
              className="input normal-case"
              type="number"
              min={0}
              step="1"
              value={tierLuxury}
              onChange={(e) => setTierLuxury(e.target.value)}
              placeholder="—"
            />
          </label>
        </div>

        <TagBlock
          label="Included amenities"
          placeholder="Enter to add"
          tags={amenities}
          onChange={setAmenities}
        />
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Location
          <input
            className="input normal-case"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-espresso-200">
          <input
            type="checkbox"
            checked={availability}
            onChange={(e) => setAvailability(e.target.checked)}
          />
          Available for booking
        </label>
        {row?.images && row.images.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Current images
            </p>
            <ul className="space-y-2 text-xs">
              {row.images.map((u, i) => (
                <li
                  key={`${i}-${u.slice(-24)}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-espresso-200/15 bg-cream-50/80 px-3 py-2"
                >
                  <span className="min-w-0 truncate font-mono text-[11px] text-espresso-200">
                    {u}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-rose-600 hover:underline"
                    disabled={saving}
                    onClick={() =>
                      void (async () => {
                        setErr(null);
                        try {
                          const { images } = await deleteServiceImage(id, i, {
                            auth: "admin",
                          });
                          setRow((prev) =>
                            prev ? { ...prev, images } : prev
                          );
                          setMsg("Image removed.");
                        } catch {
                          setErr("Could not remove that image.");
                        }
                      })()
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <ServiceImageInput
          imageFiles={imageFiles}
          onImageFilesChange={setImageFiles}
          existingImageCount={row?.images?.length ?? 0}
        />
        <button
          type="button"
          disabled={saving}
          className="btn-primary"
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
