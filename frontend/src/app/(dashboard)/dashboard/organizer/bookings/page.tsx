"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Check, MessageCircle, X } from "lucide-react";
import { BookingDetailGrid } from "@/components/booking-detail-grid";
import {
  bookingAccept,
  bookingReject,
  createReview,
  fetchBookings,
  patchBooking,
} from "@/lib/api/client";
import type { BookingApi } from "@/lib/api/types";
import { formatPKR } from "@/lib/data";
import { useAuth } from "@/components/providers";

function RateClientInline({
  clientId,
  onDone,
}: {
  clientId: number;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await createReview({
        reviewee: clientId,
        rating,
        comment: comment.trim() || "Great to work with.",
      });
      setMsg("Submitted");
      onDone();
    } catch {
      setMsg("Could not submit (maybe already reviewed).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-[220px] flex-col gap-2">
      <label className="text-[10px] uppercase tracking-[0.18em] text-muted">
        Rate client
        <input
          type="number"
          min={1}
          max={5}
          className="input mt-1 py-1 text-sm"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        />
      </label>
      <input
        className="input py-1 text-xs"
        placeholder="Short note"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        type="button"
        disabled={busy}
        className="rounded-full bg-gold-300/30 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-espresso-200 hover:bg-gold-300/50"
        onClick={() => void submit()}
      >
        {busy ? "…" : "Submit review"}
      </button>
      {msg && <span className="text-[11px] text-muted">{msg}</span>}
    </div>
  );
}

function BookingDetailPanel({
  r,
  noteDraft,
  onNoteChange,
  onSaveNote,
  savingNote,
}: {
  r: BookingApi;
  noteDraft: string;
  onNoteChange: (v: string) => void;
  onSaveNote: () => void;
  savingNote: boolean;
}) {
  return (
    <div className="mt-3 space-y-4 rounded-xl border border-espresso-200/12 bg-cream-50/50 p-4 text-sm">
      <Link
        href={`/chat/${r.client}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-600 hover:underline"
      >
        <MessageCircle size={14} aria-hidden />
        Chat with client
      </Link>
      <BookingDetailGrid booking={r} hideOrganizerNotes />
      <div>
        <label className="text-[10px] uppercase tracking-[0.18em] text-muted">
          Message to client (visible on their booking)
        </label>
        <textarea
          className="input mt-1 min-h-[72px] resize-y text-sm"
          value={noteDraft}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="e.g. We can start setup at 4pm…"
          maxLength={4000}
        />
        <button
          type="button"
          disabled={savingNote}
          className="mt-2 rounded-full bg-gold-300/35 px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] text-espresso-200 hover:bg-gold-300/55 disabled:opacity-50"
          onClick={() => void onSaveNote()}
        >
          {savingNote ? "Saving…" : "Save message"}
        </button>
      </div>
    </div>
  );
}

export default function OrganizerBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchBookings>>["results"]
  >([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  const load = async () => {
    const d = await fetchBookings({ ordering: "-created_at" });
    setRows(d.results);
    const next: Record<number, string> = {};
    d.results.forEach((r) => {
      next[r.id] = r.organizer_notes ?? "";
    });
    setNoteDrafts(next);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/organizer/bookings");
      return;
    }
    if (user.role !== "organizer") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [user, authLoading, router]);

  const saveOrganizerNote = async (id: number) => {
    setSavingNoteId(id);
    try {
      await patchBooking(id, { organizer_notes: noteDrafts[id]?.trim() ?? "" });
      await load();
    } finally {
      setSavingNoteId(null);
    }
  };

  if (authLoading || !user || user.role !== "organizer") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-espresso-200">Booking requests</h1>
        <p className="mt-1 text-sm text-muted">
          Accept or decline incoming work. Open details for full request info and a client-visible
          message.
        </p>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-espresso-200/10 bg-cream-100/40 text-[11px] uppercase tracking-[0.18em] text-muted">
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Service / Package</th>
              <th className="px-6 py-3">When</th>
              <th className="px-6 py-3">Guests</th>
              <th className="px-6 py-3">Est.</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-espresso-200/10">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="align-top px-6 py-4 font-medium">#{r.id}</td>
                <td className="align-top px-6 py-4">{r.client_display}</td>
                <td className="align-top px-6 py-4 text-muted">
                  <p>{r.service_title || r.package_name}</p>
                  {r.event_type?.trim() ? (
                    <p className="mt-0.5 text-xs text-espresso-200/80">{r.event_type}</p>
                  ) : null}
                </td>
                <td className="align-top px-6 py-4">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} className="text-gold-400" />
                    {r.event_date}
                    {r.event_time ? ` · ${String(r.event_time).slice(0, 5)}` : ""}
                  </span>
                </td>
                <td className="align-top px-6 py-4">{r.guest_count ?? "—"}</td>
                <td className="align-top px-6 py-4">
                  {r.total_estimate != null && String(r.total_estimate).trim() !== ""
                    ? formatPKR(Number(r.total_estimate))
                    : "—"}
                </td>
                <td className="align-top px-6 py-4 capitalize">{r.booking_status}</td>
                <td className="align-top px-6 py-4">
                  <div className="flex flex-col gap-3">
                    {r.booking_status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700"
                          onClick={() => void bookingAccept(r.id).then(load)}
                          aria-label="Accept"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-700"
                          onClick={() => void bookingReject(r.id).then(load)}
                          aria-label="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {r.booking_status === "completed" && (
                      <RateClientInline clientId={r.client} onDone={load} />
                    )}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gold-500 hover:underline">
                        Full details &amp; client message
                      </summary>
                      <BookingDetailPanel
                        r={r}
                        noteDraft={noteDrafts[r.id] ?? ""}
                        onNoteChange={(v) =>
                          setNoteDrafts((prev) => ({ ...prev, [r.id]: v }))
                        }
                        onSaveNote={() => void saveOrganizerNote(r.id)}
                        savingNote={savingNoteId === r.id}
                      />
                    </details>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/dashboard/organizer" className="text-sm text-gold-400 hover:underline">
        ← Back to overview
      </Link>
    </div>
  );
}
