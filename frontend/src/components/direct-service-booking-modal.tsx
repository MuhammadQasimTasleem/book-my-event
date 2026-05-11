"use client";

import { useState } from "react";
import { createBooking, fetchMe, getStoredTokens } from "@/lib/api/client";
import type { ServiceApi } from "@/lib/api/types";
import { useActiveClientEvent } from "@/components/active-client-event-provider";
import { useAuth } from "@/components/providers";
import { isClientUser, normalizeUserMe } from "@/lib/auth-roles";
import {
  TIER_LABELS,
  lineSubtotal,
  type EventCartTier,
} from "@/lib/event-cart";
import { formatPKR } from "@/lib/data";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  service: ServiceApi | null;
  organizerCompanyName: string;
  listingTitle: string;
  tier: EventCartTier;
  onSubmitted?: () => void;
};

export function DirectServiceBookingModal({
  open,
  onClose,
  service,
  organizerCompanyName,
  listingTitle,
  tier,
  onSubmitted,
}: Props) {
  const { user, ready, loading: authLoading } = useAuth();
  const { activeEvent, hydrated: eventHydrated } = useActiveClientEvent();
  const [eventDate, setEventDate] = useState("");
  const [guests, setGuests] = useState(150);
  const [eventType, setEventType] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open || !service) return null;

  const lineLike = {
    serviceId: service.id,
    organizerUserId: service.organizer,
    organizerName: service.organizer_name,
    companyName: organizerCompanyName.trim() || service.organizer_name,
    listingTitle,
    pricingUnit:
      service.pricing_unit === "per_guest" ? ("per_guest" as const) : ("per_event" as const),
    tier,
    tierPrices: (() => {
      const tp = service.tier_prices ?? {};
      const fb = Number(service.price);
      const one = (k: EventCartTier) => {
        const raw = tp[k];
        if (raw != null && String(raw).trim() !== "") {
          const n = Number(raw);
          if (Number.isFinite(n)) return n;
        }
        return Number.isFinite(fb) ? fb : 0;
      };
      return { normal: one("normal"), moderate: one("moderate"), luxury: one("luxury") };
    })(),
  };
  const est = lineSubtotal(lineLike, guests);

  const submit = async () => {
    setMsg(null);
    if (!ready || authLoading) {
      setMsg("Checking your session…");
      return;
    }
    if (!getStoredTokens()?.access) {
      setMsg("Please sign in.");
      return;
    }
    let me = null;
    try {
      me = normalizeUserMe(await fetchMe());
    } catch {
      me = null;
    }
    if (!me || !isClientUser(me)) {
      setMsg("Only client accounts can submit booking requests.");
      return;
    }
    if (!eventHydrated || !activeEvent) {
      setMsg("Create or select an event first (dashboard or checkout).");
      return;
    }
    if (!eventDate.trim()) {
      setMsg("Choose your event date.");
      return;
    }

    setBusy(true);
    try {
      const tierName = TIER_LABELS[tier];
      const base =
        notes.trim() ||
        `Direct request · ${guests} guests. Est.: ${formatPKR(est)}`;
      await createBooking({
        service: service.id,
        client_event: activeEvent.id,
        event_date: eventDate,
        event_time: null,
        guest_count: guests,
        event_type: eventType.trim() || undefined,
        notes: `${base}\n[Direct booking from organizer profile]\nTier: ${tierName} · ${listingTitle}`,
        total_estimate: est > 0 ? est : undefined,
        price_breakdown:
          est > 0
            ? [{ label: `${listingTitle} (${tierName})`, amount: String(est) }]
            : undefined,
      });
      onSubmitted?.();
      onClose();
    } catch {
      setMsg("Request could not be sent. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-espresso-950/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-book-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-espresso-200/15 bg-white p-6 shadow-xl">
        <h2 id="direct-book-title" className="font-serif text-xl text-espresso-200">
          Submit booking request
        </h2>
        <p className="mt-1 text-sm text-muted">
          Sends one request to this organizer now. To combine multiple organizers,
          use <strong>Add to event plan</strong> instead.
        </p>
        <p className="mt-3 text-sm font-medium text-espresso-200">{listingTitle}</p>
        <p className="text-xs text-muted">
          Tier: {TIER_LABELS[tier]} · Est. {formatPKR(est)}
        </p>

        {!eventHydrated ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : !activeEvent ? (
          <p className="mt-4 rounded-lg border border-amber-200/60 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
            Name your event first so requests stay grouped on your dashboard.{" "}
            <Link
              href="/dashboard/client"
              className="font-semibold text-gold-700 underline"
            >
              Open client dashboard
            </Link>
          </p>
        ) : (
          <p className="mt-4 rounded-lg border border-espresso-200/15 bg-cream-50/80 px-3 py-2 text-xs text-espresso-200">
            Linked to event: <strong>{activeEvent.title}</strong>
          </p>
        )}

        <div className="mt-4 grid gap-3">
          <div>
            <label className="label">Event date</label>
            <input
              type="date"
              className="input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Guests</label>
            <input
              type="number"
              min={1}
              className="input tabular-nums"
              value={guests}
              onChange={(e) =>
                setGuests(Math.max(1, Number(e.target.value || 1)))
              }
            />
          </div>
          <div>
            <label className="label">Event type (optional)</label>
            <input
              type="text"
              className="input"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[72px] py-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {msg ? (
          <p className="mt-3 text-sm text-rose-700">{msg}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost border border-espresso-200/20 px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              busy ||
              !isClientUser(user) ||
              !activeEvent ||
              !eventDate.trim()
            }
            onClick={() => void submit()}
            className="btn-gold px-5 py-2 disabled:opacity-45"
          >
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
        {!isClientUser(user) ? (
          <p className="mt-3 text-center text-xs text-muted">
            <Link href="/login" className="text-gold-600 underline">
              Sign in
            </Link>{" "}
            as a client to continue.
          </p>
        ) : null}
      </div>
    </div>
  );
}
