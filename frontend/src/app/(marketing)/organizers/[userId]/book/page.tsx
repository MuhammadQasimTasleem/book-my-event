"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createBooking,
  createPackage,
  createPackageItem,
  fetchMe,
  fetchOrganizerProfileByUserId,
  fetchServices,
  getStoredTokens,
} from "@/lib/api/client";
import type { OrganizerProfileApi, ServiceApi, UserMe } from "@/lib/api/types";
import { isClientUser, normalizeUserMe } from "@/lib/auth-roles";
import {
  lineTotalForService,
  quantityForService,
  unitPriceForServiceTier,
  type TierKey,
} from "@/lib/booking-pricing";
import { formatPKR } from "@/lib/data";
import { EVENT_MULTI_PRESETS, serviceListingLabel } from "@/lib/service-presets";
import { useAuth } from "@/components/providers";

type SelectionMode = "all" | "custom";

function packageTierForApi(
  mode: SelectionMode,
  globalTier: TierKey,
  selectedIds: number[],
  tierById: Record<number, TierKey>
): TierKey {
  if (mode === "all") return globalTier;
  const tiers = selectedIds.map((id) => tierById[id] ?? globalTier);
  if (tiers.length === 0) return globalTier;
  const first = tiers[0];
  if (tiers.every((t) => t === first)) return first;
  return "moderate";
}

export default function BookOrganizerPage() {
  const params = useParams();
  const router = useRouter();
  const organizerUserId = Number(params.userId);
  const { user, loading: authLoading, ready, refreshUser } = useAuth();

  const [profile, setProfile] = useState<OrganizerProfileApi | null>(null);
  const [services, setServices] = useState<ServiceApi[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [guests, setGuests] = useState(50);
  const [eventPreset, setEventPreset] = useState<string>("wedding");
  const [tier, setTier] = useState<TierKey>("moderate");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  /** Per-service tier when selectionMode === "custom" (ignored in "all"). */
  const [tierByServiceId, setTierByServiceId] = useState<Record<number, TierKey>>({});
  const [extraNotes, setExtraNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void refreshUser();
  }, [ready, refreshUser, organizerUserId]);

  useEffect(() => {
    if (!Number.isFinite(organizerUserId)) {
      setLoadErr("Invalid organizer.");
      return;
    }
    void (async () => {
      try {
        const p = await fetchOrganizerProfileByUserId(organizerUserId, {
          auth: false,
        });
        setProfile(p);
        const svc = await fetchServices({ organizer: String(organizerUserId) });
        setServices(svc.results);
      } catch {
        setLoadErr("This organizer could not be found.");
      }
    })();
  }, [organizerUserId]);

  useEffect(() => {
    if (selectionMode !== "custom") return;
    setTierByServiceId((tprev) => {
      const next = { ...tprev };
      let changed = false;
      for (const sid of selectedIds) {
        if (next[sid] == null) {
          next[sid] = tier;
          changed = true;
        }
      }
      return changed ? next : tprev;
    });
  }, [selectionMode, selectedIds, tier]);

  const effectiveSelectedIds = useMemo(() => {
    if (selectionMode === "all") return services.map((s) => s.id);
    return selectedIds;
  }, [selectionMode, services, selectedIds]);

  const resolvedEventType = useMemo(() => {
    if (eventPreset === "other_notes") return "Other";
    const row = EVENT_MULTI_PRESETS.find((x) => x.key === eventPreset);
    return row?.label ?? "Event";
  }, [eventPreset]);

  const selectedServices = useMemo(
    () => services.filter((s) => effectiveSelectedIds.includes(s.id)),
    [services, effectiveSelectedIds]
  );

  const tierForService = (serviceId: number): TierKey =>
    selectionMode === "all"
      ? tier
      : (tierByServiceId[serviceId] ?? tier);

  const breakdown = useMemo(() => {
    const lines: {
      label: string;
      amount: number;
      perGuestHint: string | null;
    }[] = [];
    const g = Math.max(1, guests);
    for (const s of selectedServices) {
      const lineTier = selectionMode === "all" ? tier : (tierByServiceId[s.id] ?? tier);
      const unit = unitPriceForServiceTier(s, lineTier);
      const qty = quantityForService(s, guests);
      const total = unit * qty;
      const qLabel =
        (s.pricing_unit ?? "per_event") === "per_guest"
          ? ` × ${qty} guests @ ${formatPKR(unit)}/guest`
          : ` (flat)`;
      let perGuestHint: string | null = null;
      if ((s.pricing_unit ?? "per_event") === "per_guest") {
        perGuestHint = `${formatPKR(unit)} per guest (${lineTier})`;
      } else if (g > 0) {
        perGuestHint = `≈ ${formatPKR(total / g)} per guest (share of ${g}) · ${lineTier}`;
      }
      lines.push({
        label: `${serviceListingLabel(s)} (${lineTier})${qLabel}`,
        amount: total,
        perGuestHint,
      });
    }
    const subtotal = lines.reduce((a, b) => a + b.amount, 0);
    const blendedPerGuest = g > 0 ? subtotal / g : 0;
    return { lines, subtotal, blendedPerGuest };
  }, [selectedServices, tier, guests, selectionMode, tierByServiceId]);

  const toggleService = (id: number) => {
    setSelectionMode("custom");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllServices = () => {
    setSelectionMode("all");
    setSelectedIds(services.map((s) => s.id));
  };

  const selectCustomizeMode = () => {
    setSelectionMode("custom");
    setSelectedIds((prev) =>
      prev.length > 0 ? prev : services.map((s) => s.id)
    );
  };

  const setServiceTier = (serviceId: number, value: TierKey) => {
    setTierByServiceId((prev) => ({ ...prev, [serviceId]: value }));
  };

  const submit = async () => {
    setMsg(null);
    setErr(null);
    if (!ready || authLoading) {
      setErr("Checking your session… try again in a moment.");
      return;
    }
    if (!getStoredTokens()?.access) {
      const next = `/organizers/${organizerUserId}/book`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    let me: UserMe | null = null;
    try {
      await refreshUser();
      me = normalizeUserMe(await fetchMe());
    } catch {
      me = null;
    }
    if (!me) {
      const next = `/organizers/${organizerUserId}/book`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!isClientUser(me)) {
      setErr(
        "Only client accounts can submit booking requests. Sign out, open Login, choose “Client / guest”, and use your client email."
      );
      return;
    }
    if (!profile) return;
    if (!eventDate.trim()) {
      setErr("Choose an event date.");
      return;
    }
    if (eventPreset === "other_notes" && !extraNotes.trim()) {
      setErr('For “Other”, describe your event type in the notes for the organizer.');
      return;
    }
    if (effectiveSelectedIds.length === 0) {
      setErr("Select at least one service, or choose “All services”.");
      return;
    }

    setBusy(true);
    try {
      const notesHead = [
        eventPreset === "other_notes" && extraNotes.trim()
          ? `Event details: ${extraNotes.trim()}`
          : null,
        eventTime ? `Start: ${eventTime}` : null,
        extraNotes.trim() && eventPreset !== "other_notes" ? extraNotes.trim() : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const pkgTier = packageTierForApi(
        selectionMode,
        tier,
        effectiveSelectedIds,
        tierByServiceId
      );

      const pkg = await createPackage({
        name: `${profile.company_name} — ${resolvedEventType}`,
        event_type: resolvedEventType,
        tier: pkgTier,
        guest_count: guests,
        venue: "",
        event_date: eventDate,
        notes: notesHead || "Booking request",
      });

      for (const id of effectiveSelectedIds) {
        const s = services.find((x) => x.id === id)!;
        const lineTier = selectionMode === "all" ? tier : tierForService(id);
        await createPackageItem({
          package: pkg.id,
          service: id,
          tier: lineTier,
          quantity: quantityForService(s, guests),
        });
      }

      const price_breakdown = breakdown.lines.map((l) => ({
        label: l.label,
        amount: String(Math.round(l.amount)),
      }));

      const tierNote =
        selectionMode === "all"
          ? `Tier: ${tier} (all services).`
          : `Per-service tiers: ${effectiveSelectedIds
              .map((id) => {
                const s = services.find((x) => x.id === id)!;
                return `${serviceListingLabel(s)} (${tierForService(id)})`;
              })
              .join("; ")}.`;

      const bookingNotes = [
        tierNote,
        selectionMode === "all" ? "All listed services included." : "Custom service selection.",
        eventPreset === "other_notes" ? `Type: Other — see package notes.` : null,
        extraNotes.trim() && eventPreset !== "other_notes" ? extraNotes.trim() : null,
      ]
        .filter(Boolean)
        .join(" · ");

      await createBooking({
        package: pkg.id,
        event_date: eventDate,
        event_time: eventTime.trim() || null,
        guest_count: guests,
        event_type: resolvedEventType,
        price_breakdown,
        total_estimate: String(Math.round(breakdown.subtotal)),
        notes: bookingNotes,
      });

      setMsg("Request sent. The organizer will review it. Track status under My Bookings.");
      router.push("/dashboard/client/bookings");
    } catch (ex: unknown) {
      const detail =
        ex && typeof ex === "object" && "detail" in ex
          ? (ex as { detail: unknown }).detail
          : null;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map(String).join(" ")
            : "Could not submit. Check your connection and try again.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const clientSignedIn = Boolean(user && isClientUser(user));

  if (loadErr) {
    return (
      <div className="section">
        <div className="container-x max-w-xl py-16">
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {loadErr}
          </p>
          <Link href="/organizers" className="mt-6 inline-block text-gold-500 hover:underline">
            ← Organizers
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="section py-24 text-center text-sm text-muted">Loading…</div>
    );
  }

  return (
    <div className="section">
      <div className="container-x max-w-3xl py-10">
        <nav className="text-xs uppercase tracking-[0.18em] text-muted">
          <Link href="/organizers" className="hover:text-gold-500">
            Organizers
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/organizers/${organizerUserId}`}
            className="hover:text-gold-500"
          >
            {profile.company_name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-espresso-200">Book</span>
        </nav>

        <h1 className="mt-4 font-serif text-3xl text-espresso-200">
          Book with {profile.company_name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Book <strong className="text-espresso-200">every service</strong> with one tier for all, or{" "}
          <strong className="text-espresso-200">customize</strong> and pick Simple, Moderate, or Luxury{" "}
          <strong>per service</strong> — the estimate breaks down each line. Pricing uses guest count for
          per-head lines and flat fees where applicable.
        </p>

        {!ready || authLoading ? (
          <p className="mt-6 text-sm text-muted">Loading your account…</p>
        ) : !user ? (
          <p className="mt-6 rounded-lg border border-espresso-200/15 bg-cream-50/50 px-4 py-3 text-sm">
            <Link
              href={`/login?next=${encodeURIComponent(`/organizers/${organizerUserId}/book`)}`}
              className="font-medium text-gold-600 hover:underline"
            >
              Sign in
            </Link>{" "}
            with a <strong>client</strong> account to confirm a booking.
          </p>
        ) : !isClientUser(user) ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You&apos;re signed in as an <strong>organizer or admin</strong>. Open{" "}
            <Link href="/login" className="font-medium text-gold-700 underline">
              Sign in
            </Link>
            , choose <strong>Client / guest</strong>, and use your client email so you can submit
            requests.
          </p>
        ) : null}

        <div className="mt-8 space-y-8 rounded-3xl border border-espresso-200/10 bg-white p-6 shadow-soft">
          <section>
            <h2 className="font-serif text-xl text-espresso-200">Event details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Date
                <input
                  type="date"
                  className="input normal-case"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Start time
                <input
                  type="time"
                  className="input normal-case"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Guests (for per-head math)
                <input
                  type="number"
                  min={1}
                  className="input normal-case"
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Event type
                <select
                  className="input normal-case"
                  value={eventPreset}
                  onChange={(e) => setEventPreset(e.target.value)}
                >
                  {EVENT_MULTI_PRESETS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                  <option value="other_notes">Other — describe in notes</option>
                </select>
              </label>
            </div>
            {selectionMode === "all" ? (
              <label className="mt-4 flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                Pricing tier (applies to every service)
                <select
                  className="input normal-case"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as TierKey)}
                >
                  <option value="normal">Simple / normal</option>
                  <option value="moderate">Moderate</option>
                  <option value="luxury">Luxury</option>
                </select>
              </label>
            ) : (
              <p className="mt-4 rounded-lg border border-gold-400/25 bg-gold-300/10 px-3 py-2 text-sm text-espresso-200">
                <strong className="font-medium">Customize:</strong> set Simple, Moderate, or Luxury{" "}
                <strong>per service</strong> in the list below. The breakdown updates for each line.
              </p>
            )}
            <label className="mt-4 flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
              Notes for the organizer
              {eventPreset === "other_notes" ? (
                <span className="font-normal normal-case text-gold-600">
                  Required for “Other”: event type and any details (e.g. Mehndi, brand launch).
                </span>
              ) : (
                <span className="font-normal normal-case text-muted">
                  Dietary needs, venue area, timeline…
                </span>
              )}
              <textarea
                className="input min-h-[88px] normal-case"
                placeholder={
                  eventPreset === "other_notes"
                    ? "Describe your event type and what you need…"
                    : "Dietary needs, venue area, timeline…"
                }
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
              />
            </label>
          </section>

          <section>
            <h2 className="font-serif text-xl text-espresso-200">Services</h2>
            <p className="mt-1 text-sm text-muted">
              Include everything they offer, or narrow the list — totals update from your tier and
              guest count.
            </p>
            {services.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No services available yet.</p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-espresso-200">
                    <input
                      type="radio"
                      name="svc-mode"
                      checked={selectionMode === "all"}
                      onChange={() => selectAllServices()}
                    />
                    All services ({services.length})
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-espresso-200">
                    <input
                      type="radio"
                      name="svc-mode"
                      checked={selectionMode === "custom"}
                      onChange={() => selectCustomizeMode()}
                    />
                    Customize — pick services and tier each one
                  </label>
                </div>
                <ul className="mt-4 space-y-3">
                  {services.map((s) => {
                    const checked = effectiveSelectedIds.includes(s.id);
                    const lineTier = tierForService(s.id);
                    const line = lineTotalForService(s, lineTier, guests);
                    const disabled = selectionMode === "all";
                    return (
                      <li key={s.id}>
                        <div
                          className={`rounded-xl border border-espresso-200/15 bg-cream-50/40 p-4 hover:border-gold-400/40 ${
                            disabled ? "opacity-90" : ""
                          }`}
                        >
                          <label
                            className={`flex gap-3 ${disabled ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleService(s.id)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-espresso-200">
                                {serviceListingLabel(s)}
                              </p>
                              <p className="text-xs text-muted">
                                {formatPKR(unitPriceForServiceTier(s, lineTier))}{" "}
                                {(s.pricing_unit ?? "per_event") === "per_guest"
                                  ? "per guest"
                                  : "per event"}{" "}
                                <span className="text-espresso-200/70">({lineTier})</span>
                                {checked ? (
                                  <span className="ml-2 font-medium text-gold-600">
                                    → line {formatPKR(line)}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          </label>
                          {selectionMode === "custom" && checked ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-espresso-200/10 pt-3 pl-8 sm:pl-9">
                              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                                Tier for this service
                              </span>
                              <select
                                className="input normal-case py-1.5 text-sm"
                                value={lineTier}
                                onChange={(e) =>
                                  setServiceTier(s.id, e.target.value as TierKey)
                                }
                              >
                                <option value="normal">Simple / normal</option>
                                <option value="moderate">Moderate</option>
                                <option value="luxury">Luxury</option>
                              </select>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-gold-400/25 bg-cream-50/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-espresso-200">
              Cost breakdown
            </h3>
            {breakdown.lines.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No services selected.</p>
            ) : (
              <>
                <ul className="mt-3 space-y-2 text-sm">
                  {breakdown.lines.map((l) => (
                    <li
                      key={l.label}
                      className="border-b border-espresso-200/10 pb-2 last:border-0"
                    >
                      <div className="flex justify-between gap-4">
                        <span className="text-espresso-200/90">{l.label}</span>
                        <span className="shrink-0 font-medium text-espresso-200">
                          {formatPKR(l.amount)}
                        </span>
                      </div>
                      {l.perGuestHint ? (
                        <p className="mt-0.5 text-xs text-muted">{l.perGuestHint}</p>
                      ) : null}
                    </li>
                  ))}
                  <li className="flex justify-between gap-4 pt-2 font-serif text-lg text-espresso-200">
                    <span>Estimated total</span>
                    <span>{formatPKR(breakdown.subtotal)}</span>
                  </li>
                  <li className="flex justify-between gap-4 border-t border-espresso-200/15 pt-2 text-sm text-espresso-200">
                    <span>Blended average (total ÷ {Math.max(1, guests)} guests)</span>
                    <span className="font-medium">
                      {formatPKR(breakdown.blendedPerGuest)} / guest
                    </span>
                  </li>
                </ul>
              </>
            )}
          </section>

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

          <button
            type="button"
            disabled={
              busy || !clientSignedIn || effectiveSelectedIds.length === 0 || !eventDate
            }
            className="btn-primary w-full sm:w-auto"
            onClick={() => void submit()}
          >
            {busy ? "Sending…" : "Confirm booking request"}
          </button>
        </div>
      </div>
    </div>
  );
}
