"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteService,
  deleteServiceImage,
  fetchService,
  patchService,
  uploadServiceImage,
} from "@/lib/api/client";
import type { ServiceApi } from "@/lib/api/types";
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

export default function OrganizerServiceEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [row, setRow] = useState<ServiceApi | null>(null);
  const [offeringLabel, setOfferingLabel] = useState("");
  const [eventPresetKeys, setEventPresetKeys] = useState<EventPresetKey[]>([]);
  const [customEventTags, setCustomEventTags] = useState<string[]>([]);
  const [servicePreset, setServicePreset] = useState<ServicePresetKey>("catering");
  const [serviceCustom, setServiceCustom] = useState("");
  const [tierSimple, setTierSimple] = useState("");
  const [tierModerate, setTierModerate] = useState("");
  const [tierLuxury, setTierLuxury] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [availability, setAvailability] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "organizer") {
      router.replace("/dashboard");
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user || user.role !== "organizer") return;
    if (!Number.isFinite(id)) return;
    void fetchService(id, { auth: true })
      .then((s) => {
        if (s.organizer !== user.id) {
          setErr("This service belongs to another organizer.");
          setRow(null);
          return;
        }
        setRow(s);
        setOfferingLabel(s.offering_label ?? "");
        const ev = parseEventTypesFromService(s);
        setEventPresetKeys(ev.presetKeys);
        setCustomEventTags(ev.customTags);
        const sv = parseStoredServiceType(s.service_type || "");
        setServicePreset(sv.preset);
        setServiceCustom(sv.custom);
        const tp = s.tier_prices ?? {};
        setTierSimple(tp.normal != null ? String(tp.normal) : "");
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
  }, [user, authLoading, router, id]);

  const buildTierPrices = (): Record<string, number> => ({
    normal: Number(tierSimple),
    moderate: Number(tierModerate),
    luxury: Number(tierLuxury),
  });

  const save = async () => {
    setMsg(null);
    setErr(null);
    const eventTypes = buildEventTypesList(eventPresetKeys, customEventTags);
    if (eventTypes.length === 0) {
      setErr("Select at least one event type.");
      return;
    }
    const serviceType = resolveServiceType(servicePreset, serviceCustom);
    if (!serviceType) {
      setErr("Choose a service type or enter a custom one.");
      return;
    }
    if (
      !tierSimple.trim() ||
      !tierModerate.trim() ||
      !tierLuxury.trim() ||
      Number(tierSimple) < 0 ||
      Number(tierModerate) < 0 ||
      Number(tierLuxury) < 0
    ) {
      setErr("Enter simple, moderate, and luxury per-head prices in PKR (all three).");
      return;
    }
    const existingCount = row?.images?.length ?? 0;
    if (existingCount + imageFiles.length > MAX_IMAGES) {
      setErr(`At most ${MAX_IMAGES} images total. Remove some or upload fewer files.`);
      return;
    }
    const urls = [...(row?.images ?? [])];
    setSaving(true);
    try {
      const tier_prices = buildTierPrices();
      const base = Math.min(tier_prices.normal, tier_prices.moderate, tier_prices.luxury);
      let uploadNote = "";
      const s = await patchService(id, {
        offering_label: offeringLabel.trim(),
        service_type: serviceType,
        category: null,
        tier: "moderate",
        price: base,
        pricing_unit: "per_guest",
        tier_prices,
        included_amenities: amenities,
        event_types: eventTypes,
        location: location.trim() || "Pakistan",
        availability,
        images: urls,
        title: "",
        description: "",
      });
      for (const f of imageFiles) {
        try {
          await uploadServiceImage(s.id, f);
        } catch {
          uploadNote =
            " Saved; one or more new uploads failed — try again or remove images to stay under the limit.";
        }
      }
      setRow(s);
      setAmenities(
        Array.isArray(s.included_amenities) ? [...s.included_amenities] : []
      );
      setImageFiles([]);
      if (uploadNote) {
        const refreshed = await fetchService(id, { auth: true });
        setRow(refreshed);
        setMsg(`Saved.${uploadNote}`);
      } else {
        const refreshed = await fetchService(id, { auth: true });
        setRow(refreshed);
        setMsg("Saved.");
      }
    } catch {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const removeListing = async () => {
    setErr(null);
    setMsg(null);
    if (
      !confirm(
        "Delete this service listing permanently? Related bookings may be affected. This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteService(id);
      router.push("/dashboard/organizer/services");
      router.refresh();
    } catch {
      setErr("Could not delete this listing.");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !user || user.role !== "organizer") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  if (!row && !err) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/organizer/services"
        className="text-sm text-gold-400 hover:underline"
      >
        ← My services
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
      {row && (
        <div className="space-y-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
          <p className="text-xs text-muted">Service #{row.id}</p>
          <p className="text-sm text-muted">
            Company description and portfolio are edited on your{" "}
            <Link href="/dashboard/organizer/profile" className="text-gold-500 hover:underline">
              Profile
            </Link>{" "}
            page. Prices are <strong className="text-espresso-200">per head (PKR)</strong>.
          </p>

          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
            Optional listing label
            <input
              className="input normal-case"
              value={offeringLabel}
              onChange={(e) => setOfferingLabel(e.target.value)}
              placeholder="If you list the same service type twice, name this line"
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
                placeholder="Describe the service"
                value={serviceCustom}
                onChange={(e) => setServiceCustom(e.target.value)}
              />
            ) : null}
          </label>

          <div className="rounded-xl border border-gold-400/25 bg-cream-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-espresso-200">
              Per-head pricing (PKR)
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Simple (normal) / head
                <input
                  className="input normal-case"
                  type="number"
                  min={0}
                  step="1"
                  value={tierSimple}
                  onChange={(e) => setTierSimple(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Moderate / head
                <input
                  className="input normal-case"
                  type="number"
                  min={0}
                  step="1"
                  value={tierModerate}
                  onChange={(e) => setTierModerate(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Luxury / head
                <input
                  className="input normal-case"
                  type="number"
                  min={0}
                  step="1"
                  value={tierLuxury}
                  onChange={(e) => setTierLuxury(e.target.value)}
                />
              </label>
            </div>
          </div>

          <TagBlock
            label="Optional add-ons / amenities"
            placeholder="e.g. LED backdrop — Enter"
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

          {row.images && row.images.length > 0 ? (
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
                            const { images } = await deleteServiceImage(id, i);
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
            existingImageCount={row.images?.length ?? 0}
          />

          <button
            type="button"
            disabled={saving}
            className="btn-primary"
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <div className="border-t border-espresso-200/10 pt-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Danger zone
            </p>
            <p className="mt-1 text-sm text-muted">
              Remove this listing from your profile and the marketplace.
            </p>
            <button
              type="button"
              disabled={saving || deleting}
              className="btn-ghost mt-3 border border-rose-200/50 text-rose-800 hover:bg-rose-50"
              onClick={() => void removeListing()}
            >
              {deleting ? "Deleting…" : "Delete this listing"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
