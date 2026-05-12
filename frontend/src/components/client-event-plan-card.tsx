"use client";

import Link from "next/link";
import { MessageCircle, User } from "lucide-react";
import type { BookingApi, ClientEventApi } from "@/lib/api/types";
import { BookingDetailGrid } from "@/components/booking-detail-grid";

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
  if (s === "completed") return "bg-cream-100 text-muted";
  return "bg-cream-100 text-muted";
}

function dateRangeLabel(bookings: BookingApi[]) {
  const dates = bookings.map((b) => b.event_date).filter(Boolean);
  if (dates.length === 0) return "—";
  const sorted = [...new Set(dates)].sort();
  if (sorted.length === 1) return sorted[0];
  return `${sorted[0]} → ${sorted[sorted.length - 1]}`;
}

type Props = {
  event: ClientEventApi;
  /** Compact rows (dashboard home). */
  compact?: boolean;
  /** Filter to apply to inner bookings */
  statusFilter?: string;
};

export function ClientEventPlanCard({ event, compact, statusFilter }: Props) {
  const bookings = event.bookings ?? [];
  const pending = bookings.filter((b) => b.booking_status === "pending").length;
  const approved = bookings.filter((b) => b.booking_status === "accepted").length;

  const displayedBookings = statusFilter && statusFilter !== "all"
    ? bookings.filter((b) => b.booking_status === statusFilter)
    : bookings;

  return (
    <li className="flex flex-col rounded-3xl border border-espresso-200/10 bg-gradient-to-b from-white to-cream-50/40 p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-espresso-200/10 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Event plan
          </p>
          <h2 className="mt-1 font-serif text-2xl text-espresso-200">
            {event.title}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {bookings.length} service request{bookings.length === 1 ? "" : "s"} ·{" "}
            {pending > 0 ? `${pending} pending` : "no pending"}
            {approved > 0 ? ` · ${approved} approved` : ""}
            {" · "}
            <span className="text-espresso-200/80">Date: {dateRangeLabel(bookings)}</span>
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-5">
        {bookings.length === 0 ? (
          <li className="rounded-xl border border-dashed border-espresso-200/20 bg-cream-50/50 px-4 py-6 text-center text-sm text-muted">
            No booking requests for this event yet. Browse{" "}
            <Link href="/organizers" className="text-gold-600 underline">
              organizers
            </Link>{" "}
            or your{" "}
            <Link href="/book-event" className="text-gold-600 underline">
              event cart
            </Link>
            .
          </li>
        ) : displayedBookings.length === 0 ? (
          <li className="rounded-xl border border-dashed border-espresso-200/20 bg-cream-50/50 px-4 py-6 text-center text-sm text-muted">
            No bookings match the selected filter.
          </li>
        ) : null}
        {displayedBookings.map((b) => (
          <li
            key={b.id}
            className="rounded-2xl border border-espresso-200/10 bg-white/90 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-espresso-200">
                  {b.service_title || b.package_name || `Booking #${b.id}`}
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                  <User size={14} className="shrink-0 text-gold-400" />
                  {b.organizer_display}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${statusPillClass(b.booking_status)}`}
              >
                {statusLabel(b.booking_status)}
              </span>
            </div>
            <div className={compact ? "mt-3" : "mt-4"}>
              <BookingDetailGrid booking={b} compact={compact} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
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
    </li>
  );
}
