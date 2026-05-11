"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import PageHero from "@/components/page-hero";
import { useActiveClientEvent } from "@/components/active-client-event-provider";
import { useEventBookingCart } from "@/components/event-booking-cart-provider";
import {
  createBooking,
  createClientEvent,
  fetchMe,
  getStoredTokens,
} from "@/lib/api/client";
import {
  TIER_LABELS,
  lineSubtotal,
  type EventCartLine,
  type EventCartTier,
} from "@/lib/event-cart";
import { formatPKR } from "@/lib/data";
import { isClientUser, normalizeUserMe } from "@/lib/auth-roles";
import { useAuth } from "@/components/providers";

function groupLinesByOrganizer(lines: EventCartLine[]) {
  const m = new Map<number, EventCartLine[]>();
  for (const line of lines) {
    const id = line.organizerUserId;
    if (!m.has(id)) m.set(id, []);
    m.get(id)!.push(line);
  }
  return [...m.entries()].sort((a, b) =>
    (a[1][0]?.companyName ?? "").localeCompare(b[1][0]?.companyName ?? "")
  );
}

export default function BookEventCheckoutPage() {
  const router = useRouter();
  const { user, ready, loading: authLoading } = useAuth();
  const {
    lines,
    removeLine,
    setLineTier,
    clearCart,
    cartSubtotal,
    hydrated,
  } = useEventBookingCart();
  const {
    activeEvent,
    setActiveEvent,
    hydrated: eventCtxHydrated,
  } = useActiveClientEvent();

  const [guests, setGuests] = useState(150);
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);

  const subtotal = useMemo(() => cartSubtotal(guests), [cartSubtotal, guests]);
  const platformFee = Math.round(subtotal * 0.03);
  const total = subtotal + platformFee;

  const grouped = useMemo(() => groupLinesByOrganizer(lines), [lines]);

  const submit = async () => {
    setMsg(null);
    if (!ready || authLoading) {
      setMsg("Checking your session… try again.");
      return;
    }
    if (!getStoredTokens()?.access) {
      router.push("/login?next=/book-event");
      return;
    }
    let me = null;
    try {
      me = normalizeUserMe(await fetchMe());
    } catch {
      me = null;
    }
    if (!me) {
      router.push("/login?next=/book-event");
      return;
    }
    if (!isClientUser(me)) {
      setMsg("Only clients can submit booking requests.");
      return;
    }
    if (!eventDate.trim()) {
      setMsg("Choose your event date.");
      return;
    }
    if (!eventCtxHydrated || !activeEvent) {
      setMsg("Create or select an event below so all requests stay on one dashboard card.");
      return;
    }
    if (lines.length === 0) {
      setMsg("Add services from organizer profiles first.");
      return;
    }

    setBusy(true);
    try {
      const baseNotes =
        notes.trim() ||
        `Custom event plan · ${guests} guests. Subtotal (est.): ${subtotal}`;
      const ref = "\n[Multi-vendor custom booking from /book-event]";
      let ok = 0;
      const failed: string[] = [];

      for (const line of lines) {
        const amount = lineSubtotal(line, guests);
        const tierName = TIER_LABELS[line.tier];
        try {
          await createBooking({
            service: line.serviceId,
            client_event: activeEvent.id,
            event_date: eventDate,
            event_time: null,
            guest_count: guests,
            event_type: eventType.trim() || undefined,
            notes: `${baseNotes}${ref}\nTier: ${tierName} · ${line.listingTitle}`,
            total_estimate: amount > 0 ? amount : undefined,
            price_breakdown:
              amount > 0
                ? [{ label: `${line.listingTitle} (${tierName})`, amount: String(amount) }]
                : undefined,
          });
          ok += 1;
        } catch {
          failed.push(`${line.companyName} — ${line.listingTitle}`);
        }
      }

      if (ok === 0) {
        setMsg("Requests could not be sent. Try again.");
        return;
      }
      clearCart();
      setMsg(
        failed.length
          ? `Sent ${ok} request(s). Failed: ${failed.join("; ")}.`
          : `Sent ${ok} booking request(s). View My Bookings for status.`
      );
      router.push("/dashboard/client/bookings");
    } catch {
      setMsg("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="py-24 text-center text-sm text-muted">Loading…</div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="your event"
        title="Review custom booking"
        subtitle="Services from multiple organizers in one checkout. Each organizer gets their own request."
        crumbs={[
          { label: "Organizers", href: "/organizers" },
          { label: "Book event" },
        ]}
        backgroundImage="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80"
      />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-4">
        {lines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-espresso-200/25 bg-cream-50/60 p-8 text-center">
            <p className="text-sm text-muted">
              Your plan is empty. Browse{" "}
              <Link href="/organizers" className="text-gold-600 underline">
                organizers
              </Link>
              , open a profile, pick a tier on each service, and tap{" "}
              <strong>Add to my event plan</strong>.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-espresso-200/12 bg-white p-6 shadow-soft">
              <h2 className="font-serif text-xl text-espresso-200">
                Organizers &amp; services
              </h2>
              <p className="mt-1 text-sm text-muted">
                One booking request per line. You can remove lines or change tier
                before submitting.
              </p>
              <ul className="mt-6 space-y-8">
                {grouped.map(([organizerId, orgLines]) => (
                  <li
                    key={organizerId}
                    className="rounded-xl border border-espresso-200/12 bg-cream-50/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Organizer
                        </p>
                        <p className="font-serif text-lg text-espresso-200">
                          {orgLines[0]?.companyName}
                        </p>
                        <p className="text-xs text-muted">
                          {orgLines[0]?.organizerName}
                        </p>
                      </div>
                      <Link
                        href={`/organizers/${organizerId}`}
                        className="text-xs font-medium text-gold-600 underline"
                      >
                        View profile
                      </Link>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {orgLines.map((line) => (
                        <li
                          key={line.serviceId}
                          className="flex flex-col gap-3 rounded-lg border border-white/80 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-espresso-200">
                              {line.listingTitle}
                            </p>
                            <p className="text-xs text-muted">
                              {line.pricingUnit === "per_guest"
                                ? "Per guest"
                                : "Per event"}{" "}
                              · qty{" "}
                              {line.pricingUnit === "per_guest"
                                ? guests
                                : 1}{" "}
                              for estimate
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label className="text-[10px] uppercase tracking-wider text-muted">
                                Tier
                              </label>
                              <select
                                className="input py-1.5 text-sm"
                                value={line.tier}
                                onChange={(e) =>
                                  setLineTier(
                                    line.serviceId,
                                    e.target.value as EventCartTier
                                  )
                                }
                              >
                                {(Object.keys(TIER_LABELS) as EventCartTier[]).map(
                                  (k) => (
                                    <option key={k} value={k}>
                                      {TIER_LABELS[k]}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                            <p className="font-serif text-lg tabular-nums text-espresso-200">
                              {formatPKR(lineSubtotal(line, guests))}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeLine(line.serviceId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200/60 px-2 py-1 text-xs text-rose-800 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8 rounded-2xl border border-espresso-200/12 bg-white p-6 shadow-soft">
              <h2 className="font-serif text-xl text-espresso-200">Your event</h2>
              <p className="mt-1 text-sm text-muted">
                All lines in this checkout are tied to one event so your dashboard shows a
                single card with every service and approval status.
              </p>
              {activeEvent ? (
                <p className="mt-4 rounded-lg border border-espresso-200/15 bg-cream-50/80 px-4 py-3 text-sm text-espresso-200">
                  <span className="text-muted">Planning: </span>
                  <strong>{activeEvent.title}</strong>
                  <Link
                    href="/dashboard/client"
                    className="ml-2 text-xs font-medium text-gold-600 underline"
                  >
                    Change on dashboard
                  </Link>
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="grow">
                    <label className="label">Event title</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Ayesha & Omar — wedding weekend"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={
                      creatingEvent ||
                      !newEventTitle.trim() ||
                      !isClientUser(user)
                    }
                    onClick={() => {
                      void (async () => {
                        if (!newEventTitle.trim()) return;
                        if (!getStoredTokens()?.access) {
                          router.push("/login?next=/book-event");
                          return;
                        }
                        let me = null;
                        try {
                          me = normalizeUserMe(await fetchMe());
                        } catch {
                          me = null;
                        }
                        if (!me || !isClientUser(me)) {
                          router.push("/login?next=/book-event");
                          return;
                        }
                        setCreatingEvent(true);
                        try {
                          const ev = await createClientEvent({
                            title: newEventTitle.trim(),
                          });
                          setActiveEvent(ev.id, ev.title);
                          setNewEventTitle("");
                        } catch {
                          setMsg("Could not create event. Try again.");
                        } finally {
                          setCreatingEvent(false);
                        }
                      })();
                    }}
                    className="btn-gold shrink-0 px-5 py-2.5 disabled:opacity-45"
                  >
                    {creatingEvent ? "Saving…" : "Save event"}
                  </button>
                </div>
              )}
              {!isClientUser(user) ? (
                <p className="mt-3 text-xs text-muted">
                  <Link href="/login?next=/book-event" className="text-gold-600 underline">
                    Sign in
                  </Link>{" "}
                  as a client to name your event.
                </p>
              ) : null}
            </section>

            <section className="mt-8 rounded-2xl border border-espresso-200/12 bg-white p-6 shadow-soft">
              <h2 className="font-serif text-xl text-espresso-200">Event details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Event date</label>
                  <input
                    type="date"
                    className="input"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Guest count</label>
                  <input
                    type="number"
                    min={1}
                    className="input tabular-nums"
                    value={guests}
                    onChange={(e) =>
                      setGuests(Math.max(1, Number(e.target.value || 1)))
                    }
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Used for per-guest priced services.
                  </p>
                </div>
                <div>
                  <label className="label">Event type (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Wedding, corporate…"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notes for organizers</label>
                  <textarea
                    className="input min-h-[88px] py-3"
                    placeholder="Venue, timing, dietary needs…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-espresso-200/12 bg-espresso-200 p-6 text-cream-50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-100/70">
                Estimated total
              </h2>
              <p className="mt-2 font-serif text-4xl tabular-nums">
                {formatPKR(total)}
              </p>
              <p className="mt-1 text-xs text-cream-100/70">
                Subtotal {formatPKR(subtotal)} + 3% platform fee{" "}
                {formatPKR(platformFee)} (estimate only).
              </p>
            </section>

            {msg ? (
              <p className="mt-4 rounded-lg border border-cream-100/20 bg-cream-50 px-3 py-2 text-center text-sm text-espresso-200">
                {msg}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Link
                href="/organizers"
                className="btn-ghost order-2 border border-espresso-200/20 text-center sm:order-1"
              >
                Add more services
              </Link>
              <button
                type="button"
                disabled={busy || !isClientUser(user)}
                onClick={() => void submit()}
                className="btn-gold order-1 px-8 py-3 sm:order-2 disabled:opacity-50"
              >
                {busy
                  ? "Submitting…"
                  : isClientUser(user)
                    ? "Submit all requests"
                    : "Sign in as client to submit"}
              </button>
            </div>
            {!isClientUser(user) ? (
              <p className="mt-3 text-center text-xs text-muted">
                <Link href="/login?next=/book-event" className="text-gold-600 underline">
                  Sign in
                </Link>{" "}
                with a client account to send booking requests.
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
