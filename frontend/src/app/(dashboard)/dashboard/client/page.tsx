"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
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
  fetchBookings,
  fetchNotifications,
  fetchServices,
} from "@/lib/api/client";
import { mapServiceApiToCard } from "@/lib/map-service";
import { useAuth } from "@/components/providers";

export default function ClientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{
    total_bookings: number;
    pending_bookings: number;
    completed_bookings: number;
  } | null>(null);
  const [bookings, setBookings] = useState<
    Awaited<ReturnType<typeof fetchBookings>>["results"]
  >([]);
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
        const [dash, book, notif, svc] = await Promise.all([
          clientDashboard(),
          fetchBookings(),
          fetchNotifications(),
          fetchServices({}),
        ]);
        setStats(dash);
        setBookings(book.results.slice(0, 5));
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
        <Link href="/package-builder" className="btn-primary">
          <Sparkles size={16} /> Plan a new event
        </Link>
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
          <h2 className="font-serif text-2xl text-espresso-200">My bookings</h2>
          <Link
            href="/dashboard/client/bookings"
            className="text-xs uppercase tracking-[0.18em] text-gold-400"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y divide-espresso-200/10">
          {bookings.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted">No bookings yet.</p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="grid gap-3 px-6 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                    <span>#{b.id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} className="text-gold-400" />
                      {b.event_date}
                    </span>
                  </div>
                  <p className="mt-1 font-serif text-lg text-espresso-200">
                    {b.service_title || b.package_name || "Booking"}
                  </p>
                  <p className="text-xs text-muted">{b.notes || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${
                      b.booking_status === "accepted"
                        ? "bg-emerald-50 text-emerald-700"
                        : b.booking_status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : b.booking_status === "rejected"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-cream-100 text-muted"
                    }`}
                  >
                    {b.booking_status}
                  </span>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full border border-espresso-200/15 text-espresso-200 hover:bg-cream-100"
                    aria-label="Open"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
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
