"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import StatCard from "@/components/stat-card";
import { formatPKR } from "@/lib/data";
import {
  clientDashboard,
  createClientEvent,
  fetchClientEvents,
  fetchNotifications,
  fetchServices,
} from "@/lib/api/client";
import type { ClientEventApi } from "@/lib/api/types";
import { useActiveClientEvent } from "@/components/active-client-event-provider";
import { ClientEventPlanCard } from "@/components/client-event-plan-card";
import { mapServiceApiToCard } from "@/lib/map-service";
import { useAuth } from "@/components/providers";

export default function ClientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { setActiveEvent } = useActiveClientEvent();
  const router = useRouter();
  const [stats, setStats] = useState<{
    total_bookings: number;
    pending_bookings: number;
    completed_bookings: number;
  } | null>(null);
  const [events, setEvents] = useState<ClientEventApi[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [notifications, setNotifications] = useState<
    Awaited<ReturnType<typeof fetchNotifications>>["results"]
  >([]);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof mapServiceApiToCard>[]>(
    []
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/client");
      return;
    }
    if (user.role !== "client") {
      router.replace("/dashboard");
      return;
    }
    (async () => {
      try {
        const [dash, ev, notif, svc] = await Promise.all([
          clientDashboard(),
          fetchClientEvents(),
          fetchNotifications(),
          fetchServices({}),
        ]);
        setStats(dash);
        setEvents(ev.results.slice(0, 4));
        setNotifications(notif.results.slice(0, 6));
        setSuggestions(svc.results.slice(0, 4).map(mapServiceApiToCard));
      } catch {
        /* offline */
      }
    })();
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== "client") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  const displayName = user.first_name || user.email;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-script text-2xl text-gold-300">welcome back</p>
          <h1 className="font-serif text-3xl text-espresso-200">
            Hello, {displayName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/package-builder" className="btn-primary">
            <Sparkles size={16} /> Build package
          </Link>
          <Link
            href="/organizers"
            className="btn-ghost border border-espresso-200/15 px-4 py-2"
          >
            Browse organizers
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gold-400/25 bg-gold-50/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-espresso-200/80">
          Quick: new event title
        </p>
        <p className="mt-1 text-sm text-muted">
          Sets the active plan for cart checkout, package builder, and direct requests.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            type="text"
            className="input min-w-0 grow"
            placeholder="e.g. Sana’s mehndi weekend"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
          />
          <button
            type="button"
            disabled={creatingEvent || !newEventTitle.trim()}
            onClick={() => {
              void (async () => {
                if (!newEventTitle.trim()) return;
                setCreatingEvent(true);
                try {
                  const ev = await createClientEvent({
                    title: newEventTitle.trim(),
                  });
                  setActiveEvent(ev.id, ev.title);
                  setEvents((prev) => [ev, ...prev].slice(0, 4));
                  setNewEventTitle("");
                } catch {
                  /* toast-free */
                } finally {
                  setCreatingEvent(false);
                }
              })();
            }}
            className="btn-gold shrink-0 px-4 py-2.5 text-sm disabled:opacity-45"
          >
            {creatingEvent ? "Saving…" : "Create"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Total bookings"
          value={String(stats?.total_bookings ?? "—")}
          hint={`${stats?.pending_bookings ?? 0} pending`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={String(stats?.completed_bookings ?? "—")}
          hint="Lifetime"
        />
        <StatCard
          icon={Wallet}
          label="Activity"
          value={formatPKR(0)}
          hint="Payments via backend"
        />
        <StatCard icon={Star} label="Tips" value="4.9" hint="Keep exploring" />
      </div>

      <section className="rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <div className="flex items-center justify-between p-6">
          <h2 className="font-serif text-2xl text-espresso-200">My events</h2>
          <Link
            href="/dashboard/client/bookings"
            className="text-xs uppercase tracking-[0.18em] text-gold-400"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-6 px-6 pb-6">
          {events.length === 0 ? (
            <p className="py-4 text-sm text-muted">
              No event plans yet. Create a title above, then add services from the
              marketplace.
            </p>
          ) : (
            events.map((ev) => (
              <ClientEventPlanCard key={ev.id} event={ev} compact />
            ))
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl border border-espresso-200/10 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-espresso-200">
              Suggested for you
            </h2>
            <Link
              href="/organizers"
              className="text-xs uppercase tracking-[0.18em] text-gold-400"
            >
              Browse all →
            </Link>
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="flex gap-3 rounded-xl border border-espresso-200/10 p-3"
              >
                <div
                  className="h-20 w-24 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${s.image})` }}
                />
                <div className="min-w-0">
                  <p className="truncate font-serif text-sm text-espresso-200">
                    {s.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    {s.city} • {s.organizer}
                  </p>
                  <p className="mt-1 font-serif text-sm text-gold-400">
                    {formatPKR(s.priceFrom)}{" "}
                    <span className="text-[11px] text-muted">{s.unit}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-espresso-200/10 bg-white p-6 shadow-soft">
          <h2 className="font-serif text-2xl text-espresso-200">
            Notifications
          </h2>
          <ul className="mt-5 space-y-4 text-sm">
            {notifications.length === 0 ? (
              <li className="text-muted">You&apos;re all caught up.</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream-100 text-gold-400">
                    <MessageCircle size={14} />
                  </span>
                  <div>
                    <p className="font-medium text-espresso-200">{n.title}</p>
                    <p className="text-espresso-200">{n.message}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
