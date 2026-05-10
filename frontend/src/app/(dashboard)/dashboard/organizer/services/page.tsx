"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OrganizerServicesBatchEditor } from "@/components/organizer-services-batch-editor";
import { useAuth } from "@/components/providers";
import { isOrganizerUser } from "@/lib/auth-roles";
import { formatPKR } from "@/lib/data";
import { API_ORIGIN } from "@/lib/config";
import { mapServiceApiToCard } from "@/lib/map-service";
import { deleteService, fetchServices } from "@/lib/api/client";
import type { ServiceApi } from "@/lib/api/types";
import { serviceListingLabel } from "@/lib/service-presets";

function thumbUrl(src: string | null | undefined): string {
  if (!src) {
    return "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80";
  }
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const base = API_ORIGIN.replace(/\/$/, "");
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

export default function OrganizerServicesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ServiceApi[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoadErr(null);
    try {
      const svc = await fetchServices({}, { auth: true });
      const mine = svc.results.filter((s) => s.organizer === user.id);
      setRows(mine);
    } catch {
      setLoadErr("Could not load your services. Check your connection and try again.");
      setRows([]);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/organizer/services");
      return;
    }
    if (!isOrganizerUser(user)) {
      router.replace("/dashboard");
      return;
    }
    void reload();
  }, [user, authLoading, router, reload]);

  const removeService = async (serviceId: number) => {
    setDeleteErr(null);
    if (
      !confirm(
        "Delete this service listing? Bookings tied to it may be affected. This cannot be undone."
      )
    ) {
      return;
    }
    setDeletingId(serviceId);
    try {
      await deleteService(serviceId);
      await reload();
    } catch {
      setDeleteErr("Could not delete the service. Try again or contact support.");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || !user || !isOrganizerUser(user)) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl text-espresso-200">My services</h1>
        <p className="mt-1 text-sm text-muted">
          You need <strong className="text-espresso-200">at least one</strong> service to submit for
          review; extra rows are optional. Use <strong className="text-espresso-200">Publish all services</strong>{" "}
          after filling the table. Your business name, story, and portfolio live on the Profile page.
        </p>
        <Link
          href="/dashboard/organizer"
          className="mt-2 inline-block text-sm text-gold-400 hover:underline"
        >
          ← Overview
        </Link>
      </div>

      {loadErr ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {loadErr}
        </p>
      ) : null}
      {deleteErr ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {deleteErr}
        </p>
      ) : null}

      <OrganizerServicesBatchEditor onSaved={() => void reload()} />

      <section>
        <h2 className="font-serif text-xl text-espresso-200">Your listings</h2>
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.length === 0 ? (
            <li className="text-sm text-muted">No services yet.</li>
          ) : (
            rows.map((raw) => {
              const s = mapServiceApiToCard(raw);
              const min = Number(raw.price_min ?? raw.price);
              const max = Number(raw.price_max ?? raw.price);
              const showRange = Number.isFinite(max) && max > min;
              const unit =
                raw.pricing_unit === "per_guest" ? "per head" : "per event";
              const listingName = serviceListingLabel(raw);
              return (
                <li
                  key={raw.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-espresso-200/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-gold"
                >
                  <div className="relative aspect-[5/3] bg-cream-100/50">
                    {/* Native img: service thumbs may use any API host (NEXT_PUBLIC_API_ORIGIN). */}
                    <img
                      src={thumbUrl(raw.primary_image || raw.images?.[0])}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-cream-50/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-espresso-200">
                      {(raw.service_type || "Service").trim() || "Service"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-serif text-lg leading-snug text-espresso-200">
                      {listingName}
                    </p>
                    <p className="mt-1 text-xs text-muted">{s.city}</p>
                    {(() => {
                      const evChips =
                        raw.event_types && raw.event_types.length > 0
                          ? raw.event_types
                          : (raw.event_type || "")
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean);
                      return evChips.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {evChips.slice(0, 8).map((ev) => (
                            <span
                              key={ev}
                              className="rounded-full border border-gold-400/40 bg-cream-50/90 px-2 py-0.5 text-[10px] text-espresso-200"
                            >
                              {ev}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {raw.included_amenities && raw.included_amenities.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {raw.included_amenities.slice(0, 4).map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-cream-100 px-2 py-0.5 text-[10px] text-espresso-200/90"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-3 font-serif text-gold-400">
                      {showRange ? (
                        <>
                          {formatPKR(min)} – {formatPKR(max)}
                        </>
                      ) : (
                        formatPKR(min)
                      )}
                      <span className="ml-1 font-sans text-xs text-muted">
                        {unit}
                      </span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-espresso-200/10 pt-3">
                      <Link
                        href={`/dashboard/organizer/services/${raw.id}`}
                        className="rounded-lg bg-espresso-200 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-cream-50 hover:bg-espresso-200/90"
                      >
                        Edit
                      </Link>
                      <Link
                        href={user ? `/organizers/${user.id}` : "/organizers"}
                        className="rounded-lg border border-espresso-200/15 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-gold-400 hover:border-gold-400/40"
                      >
                        Public profile
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === raw.id}
                        className="rounded-lg border border-rose-200/40 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        onClick={() => void removeService(raw.id)}
                      >
                        {deletingId === raw.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
