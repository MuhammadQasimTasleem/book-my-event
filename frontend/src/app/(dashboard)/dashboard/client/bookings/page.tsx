"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, User } from "lucide-react";
import { useActiveClientEvent } from "@/components/active-client-event-provider";
import { BookingDetailGrid } from "@/components/booking-detail-grid";
import { ClientEventPlanCard } from "@/components/client-event-plan-card";
import {
  createClientEvent,
  fetchBookings,
  fetchClientEvents,
} from "@/lib/api/client";
import type { BookingApi, ClientEventApi } from "@/lib/api/types";
import { isClientUser } from "@/lib/auth-roles";
import { useAuth } from "@/components/providers";

function statusLabel(s: string) {
  if (s === "accepted") return "Approved";
  if (s === "pending") return "Pending";
  if (s === "rejected") return "Rejected";
  if (s === "completed") return "Completed";
  return s;
}

function statusPillClass(s: string) {
  if (s === "accepted") return "bg-emerald-50 text-emerald-700";
  if (s === "pending") return "bg-amber-50 text-amber-700";
  if (s === "rejected") return "bg-rose-50 text-rose-700";
  return "bg-cream-100 text-muted";
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { setActiveEvent } = useActiveClientEvent();
  const router = useRouter();
  const [events, setEvents] = useState<ClientEventApi[]>([]);
  const [rows, setRows] = useState<BookingApi[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/client/bookings");
      return;
    }
    if (!isClientUser(user)) {
      router.replace("/dashboard");
      return;
    }
    void (async () => {
      try {
        const [evRes, bookRes] = await Promise.all([
          fetchClientEvents(),
          fetchBookings({ ordering: "-created_at" }),
        ]);
        setEvents(evRes.results);
        setRows(bookRes.results);
        setLoadErr(null);
      } catch {
        setLoadErr("Could not load events. Try refreshing.");
      }
    })();
  }, [user, authLoading, router]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const bookings = ev.bookings ?? [];
      if (statusFilter === "all") return true;
      return bookings.some((b) => b.booking_status === statusFilter);
    });
  }, [events, statusFilter]);

  const legacyBookings = useMemo(() => {
    return rows.filter((b) => b.client_event == null);
  }, [rows]);

  const filteredLegacy = useMemo(() => {
    return legacyBookings.filter((b) =>
      statusFilter === "all" ? true : b.booking_status === statusFilter
    );
  }, [legacyBookings, statusFilter]);

  if (authLoading || !user || !isClientUser(user)) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  const chips: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "accepted", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "completed", label: "Completed" },
  ];

  const showEmpty = filteredEvents.length === 0 && filteredLegacy.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-espresso-200">My events</h1>
        <p className="mt-1 text-sm text-muted">
          One card per event. Each line is a separate organizer request with its own
          approval status.
        </p>
      </div>

      <div className="rounded-2xl border border-espresso-200/10 bg-white p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          New event plan
        </p>
        <p className="mt-1 text-sm text-muted">
          Name an event, then add services from organizer pages, the package builder, or
          your cart. Active plan for browsing is updated when you save.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 grow">
            <label className="label text-xs">Title</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Annual gala 2026"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={creating || !newTitle.trim()}
            onClick={() => {
              void (async () => {
                if (!newTitle.trim()) return;
                setCreating(true);
                try {
                  const ev = await createClientEvent({ title: newTitle.trim() });
                  setActiveEvent(ev.id, ev.title);
                  setEvents((prev) => [ev, ...prev]);
                  setNewTitle("");
                } catch {
                  setLoadErr("Could not create event.");
                } finally {
                  setCreating(false);
                }
              })();
            }}
            className="btn-gold shrink-0 px-5 py-2.5 text-sm disabled:opacity-45"
          >
            {creating ? "Creating…" : "Create & set active"}
          </button>
        </div>
      </div>

      {loadErr ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {loadErr}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStatusFilter(c.id)}
            className={`rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] ${
              statusFilter === c.id
                ? "bg-espresso-200 text-cream-50"
                : "border border-espresso-200/15 bg-white text-muted hover:border-gold-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {showEmpty ? (
        <div className="rounded-3xl border border-espresso-200/10 bg-white py-16 text-center text-sm text-muted shadow-soft">
          No events in this view.{" "}
          <Link href="/organizers" className="text-gold-400 hover:underline">
            Find organizers
          </Link>{" "}
          or use{" "}
          <Link href="/package-builder" className="text-gold-400 hover:underline">
            Build package
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-10">
          <ul className="grid gap-8 lg:grid-cols-1">
            {filteredEvents.map((ev) => (
              <ClientEventPlanCard key={ev.id} event={ev} />
            ))}
          </ul>

          {filteredLegacy.length > 0 ? (
            <div>
              <h2 className="font-serif text-xl text-espresso-200">
                Other requests (not grouped)
              </h2>
              <p className="mt-1 text-sm text-muted">
                Older bookings without an event title appear here individually.
              </p>
              <ul className="mt-4 grid gap-6 lg:grid-cols-2">
                {filteredLegacy.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col rounded-3xl border border-espresso-200/10 bg-gradient-to-b from-white to-cream-50/40 p-6 shadow-soft"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-espresso-200/10 pb-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                          Booking #{b.id}
                        </p>
                        <p className="mt-1 font-serif text-xl text-espresso-200">
                          {b.service_title || b.package_name || "Booking"}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-espresso-200/90">
                          <User size={14} className="text-gold-400" />
                          {b.organizer_display}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${statusPillClass(b.booking_status)}`}
                      >
                        {statusLabel(b.booking_status)}
                      </span>
                    </div>
                    <div className="mt-4 grow">
                      <BookingDetailGrid booking={b} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-espresso-200/10 pt-4">
                      <Link
                        href={`/chat/${b.organizer}`}
                        className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-gold-400 hover:underline"
                      >
                        <MessageCircle size={12} /> Message organizer
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
