"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ClipboardList,
  Plus,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { BookingDetailGrid } from "@/components/booking-detail-grid";
import { OrganizerOnboardingBanner } from "@/components/organizer-onboarding-banner";
import StatCard from "@/components/stat-card";
import { formatPKR } from "@/lib/data";
import {
  bookingAccept,
  bookingReject,
  fetchBookings,
  fetchOrganizers,
  fetchServices,
  organizerDashboard,
} from "@/lib/api/client";
import type { OrganizerProfileApi } from "@/lib/api/types";
import { mapServiceApiToCard } from "@/lib/map-service";
import { useAuth } from "@/components/providers";
import { isOrganizerUser } from "@/lib/auth-roles";

export default function OrganizerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const welcomeCleared = useRef(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [dash, setDash] = useState<Awaited<
    ReturnType<typeof organizerDashboard>
  > | null>(null);
  const [requests, setRequests] = useState<
    Awaited<ReturnType<typeof fetchBookings>>["results"]
  >([]);
  const [myServices, setMyServices] = useState<ReturnType<typeof mapServiceApiToCard>[]>(
    []
  );
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfileApi | null>(
    null
  );
  const [serviceCount, setServiceCount] = useState(0);

  const reload = async () => {
    if (!user || !isOrganizerUser(user)) return;
    const [d, books, svc, orgRows] = await Promise.all([
      organizerDashboard(),
      fetchBookings({ booking_status: "pending" }),
      fetchServices({}),
      fetchOrganizers({ user: String(user.id) }, { auth: true }),
    ]);
    setDash(d);
    setRequests(books.results);
    const mine = svc.results.filter((s) => s.organizer === user.id);
    setServiceCount(mine.length);
    setMyServices(mine.slice(0, 8).map(mapServiceApiToCard));
    setOrganizerProfile(orgRows.results[0] ?? null);
  };

  useEffect(() => {
    if (typeof window === "undefined" || welcomeCleared.current) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("welcome") === "organizer") {
      setShowWelcome(true);
      welcomeCleared.current = true;
      window.history.replaceState(null, "", "/dashboard/organizer");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/organizer");
      return;
    }
    if (!isOrganizerUser(user)) {
      router.replace("/dashboard");
      return;
    }
    void reload();
  }, [user, authLoading, router]);

  const onAccept = async (id: number) => {
    await bookingAccept(id);
    await reload();
  };

  const onReject = async (id: number) => {
    await bookingReject(id);
    await reload();
  };

  if (authLoading || !user || !isOrganizerUser(user)) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  const orgName =
    `${user.first_name} ${user.last_name}`.trim() || user.email;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-script text-2xl text-gold-300">workspace</p>
          <h1 className="font-serif text-3xl text-espresso-200">{orgName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/organizer/profile" className="btn-ghost border border-espresso-200/20">
            Profile &amp; portfolio
          </Link>
          <Link href="/dashboard/organizer/services" className="btn-primary">
            <Plus size={16} /> Add a service
          </Link>
        </div>
      </div>

      {showWelcome && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-5 py-4 text-sm text-emerald-950 shadow-soft">
          <p className="font-medium">Welcome to your organizer workspace.</p>
          <p className="mt-1 text-emerald-900/90">
            Complete your profile and services below. You are not visible on the public marketplace
            until staff approves your profile.
          </p>
        </div>
      )}

      <OrganizerOnboardingBanner profile={organizerProfile} hasServices={serviceCount > 0} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Pending requests"
          value={String(dash?.pending_bookings ?? "—")}
          hint="Awaiting your response"
        />
        <StatCard
          icon={CalendarCheck}
          label="Total bookings"
          value={String(dash?.total_bookings ?? "—")}
          hint="All statuses"
        />
        <StatCard
          icon={TrendingUp}
          label="Services listed"
          value={String(dash?.total_services ?? "—")}
          hint="Live on marketplace"
        />
        <StatCard
          icon={Star}
          label="Avg rating"
          value={String(dash?.average_rating ?? "—")}
          hint="From reviews"
        />
      </div>

      <section className="rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-espresso-200/10 px-6 py-5">
          <h2 className="font-serif text-2xl text-espresso-200">Booking requests</h2>
          <Link
            href="/dashboard/organizer/bookings"
            className="text-xs uppercase tracking-[0.18em] text-gold-400"
          >
            View all →
          </Link>
        </div>
        <div className="p-6">
          {requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No pending requests.</p>
          ) : (
            <ul className="grid gap-5 lg:grid-cols-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col rounded-2xl border border-espresso-200/12 bg-gradient-to-b from-white to-cream-50/30 p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-espresso-200/10 pb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                        Booking #{r.id}
                      </p>
                      <p className="mt-1 font-serif text-lg text-espresso-200">
                        {r.service_title || r.package_name || "Request"}
                      </p>
                      <p className="text-sm text-espresso-200/85">{r.client_display}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        onClick={() => void onAccept(r.id)}
                        aria-label="Accept"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100"
                        onClick={() => void onReject(r.id)}
                        aria-label="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <BookingDetailGrid booking={r} compact />
                  </div>
                  {r.notes?.trim() ? (
                    <p className="mt-3 line-clamp-2 text-xs text-muted">
                      <span className="font-medium text-espresso-200/70">Note: </span>
                      {r.notes.trim()}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-espresso-200/10 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-espresso-200">My services</h2>
          <Link
            href="/dashboard/organizer/services"
            className="flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-gold-400"
          >
            <ClipboardList size={12} /> Manage
          </Link>
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {myServices.length === 0 ? (
            <li className="text-sm text-muted">
              No services yet. Add one to appear on the marketplace (requires
              admin approval as an organizer).
            </li>
          ) : (
            myServices.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-4 rounded-xl border border-espresso-200/10 p-3"
              >
                <div
                  className="h-16 w-20 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${s.image})` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-sm text-espresso-200">
                    {s.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    {s.category} • {s.city}
                  </p>
                  <p className="mt-1 font-serif text-sm text-gold-400">
                    {formatPKR(s.priceFrom)}{" "}
                    <span className="text-[11px] text-muted">{s.unit}</span>
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
