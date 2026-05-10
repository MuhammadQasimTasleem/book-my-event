import { CalendarDays, Users } from "lucide-react";
import type { BookingApi } from "@/lib/api/types";
import { formatPKR } from "@/lib/data";

type Props = {
  booking: BookingApi;
  /** When true, omit breakdown list and long notes. */
  compact?: boolean;
  /** Hide read-only organizer message (e.g. when editing it elsewhere). */
  hideOrganizerNotes?: boolean;
};

export function BookingDetailGrid({ booking: b, compact, hideOrganizerNotes }: Props) {
  const lines = Array.isArray(b.price_breakdown) ? b.price_breakdown : [];
  const est =
    b.total_estimate != null && String(b.total_estimate).trim() !== ""
      ? formatPKR(Number(b.total_estimate))
      : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-espresso-200/10 bg-cream-50/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">When</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-espresso-200">
            <CalendarDays size={14} className="text-gold-400" />
            {b.event_date}
            {b.event_time ? ` · ${String(b.event_time).slice(0, 5)}` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-espresso-200/10 bg-cream-50/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Guests &amp; type</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-espresso-200">
            <Users size={14} className="text-gold-400" />
            {b.guest_count ?? "—"}
            {b.event_type?.trim() ? ` · ${b.event_type}` : ""}
          </p>
        </div>
        {est && (
          <div className="rounded-xl border border-espresso-200/10 bg-cream-50/50 px-3 py-2 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Estimate</p>
            <p className="mt-0.5 font-serif text-lg text-gold-600">{est}</p>
          </div>
        )}
      </div>
      {!compact && b.notes?.trim() && (
        <div className="rounded-xl border border-espresso-200/8 bg-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Client notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-espresso-200">{b.notes.trim()}</p>
        </div>
      )}
      {!compact && lines.length > 0 && (
        <div className="rounded-xl border border-espresso-200/8 bg-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Price breakdown</p>
          <ul className="mt-2 space-y-1 text-sm text-espresso-200">
            {lines.map((line, i) => (
              <li
                key={`${b.id}-pl-${i}`}
                className="flex justify-between gap-4 border-b border-espresso-200/5 pb-1 last:border-0 last:pb-0"
              >
                <span className="text-muted">{line.label}</span>
                <span className="font-medium tabular-nums">{formatPKR(Number(line.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!compact && !hideOrganizerNotes && b.organizer_notes?.trim() && (
        <div className="rounded-xl border border-gold-300/30 bg-gold-300/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold-700">Organizer message</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-espresso-200">
            {b.organizer_notes.trim()}
          </p>
        </div>
      )}
    </div>
  );
}
