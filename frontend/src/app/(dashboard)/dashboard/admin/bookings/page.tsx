"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, User } from "lucide-react";
import { BookingDetailGrid } from "@/components/booking-detail-grid";
import { fetchBookings } from "@/lib/api/client";
import type { BookingApi } from "@/lib/api/types";
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

export default function AdminBookingsPage() {
  const { adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<BookingApi[]>([]);

  const load = useCallback(async () => {
    const d = await fetchBookings({ ordering: "-created_at" }, { auth: "admin" });
    setRows(d.results);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.replace("/dashboard/admin/login?next=/dashboard/admin/bookings");
      return;
    }
    if (adminUser.role !== "admin") {
      router.replace("/dashboard/admin/login");
      return;
    }
    void load().catch(() => {});
  }, [adminUser, authLoading, router, load]);

  if (authLoading || !adminUser || adminUser.role !== "admin") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-espresso-200">All bookings</h1>
          <p className="mt-1 text-sm text-muted">
            Every client request across organizers — structured for quick review.
          </p>
        </div>
        <Link href="/dashboard/admin" className="text-sm text-gold-400 hover:underline">
          ← Admin overview
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-espresso-200/10 bg-white py-16 text-center text-sm text-muted shadow-soft">
          No bookings yet.
        </div>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {rows.map((b) => (
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
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-espresso-200/90">
                    <span className="inline-flex items-center gap-1.5">
                      <User size={14} className="text-gold-400" />
                      {b.client_display}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <CalendarDays size={14} className="text-gold-400" />
                      Organizer: {b.organizer_display}
                    </span>
                  </div>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
