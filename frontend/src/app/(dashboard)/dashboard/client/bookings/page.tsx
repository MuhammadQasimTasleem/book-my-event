"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, User } from "lucide-react";
import { BookingDetailGrid } from "@/components/booking-detail-grid";
import { fetchBookings } from "@/lib/api/client";
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
  const router = useRouter();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchBookings>>["results"]
  >([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    void fetchBookings({ ordering: "-created_at" }).then((d) => setRows(d.results));
  }, [user, authLoading, router]);

  if (authLoading || !user || !isClientUser(user)) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  const filtered =
    statusFilter === "all"
      ? rows
      : rows.filter((b) => b.booking_status === statusFilter);

  const chips: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "accepted", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-espresso-200">My bookings</h1>
        <p className="mt-1 text-sm text-muted">
          Track every event from request to celebration — newest first.
        </p>
      </div>

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

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-espresso-200/10 bg-white py-16 text-center text-sm text-muted shadow-soft">
          No bookings in this view.{" "}
          <Link href="/organizers" className="text-gold-400 hover:underline">
            Find organizers
          </Link>
        </div>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {filtered.map((b) => (
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
                  href="/dashboard/client/messages"
                  className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-gold-400 hover:underline"
                >
                  <MessageCircle size={12} /> Message organizer
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
