"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import PageHero from "@/components/page-hero";
import { fetchOrganizers } from "@/lib/api/client";
import type { OrganizerProfileApi } from "@/lib/api/types";
import { API_ORIGIN } from "@/lib/config";
import { formatPKR } from "@/lib/data";

function photoThumb(p: OrganizerProfileApi): string {
  const first = p.event_photos?.[0]?.image;
  if (first) {
    if (first.startsWith("http")) return first;
    const base = API_ORIGIN.replace(/\/$/, "");
    return `${base}${first.startsWith("/") ? first : `/${first}`}`;
  }
  return "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80";
}

function ServiceTypeChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full truncate rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium leading-tight text-teal-900 ring-1 ring-teal-200/70">
      {children}
    </span>
  );
}

function EventTypeChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full truncate rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium leading-tight text-rose-900 ring-1 ring-rose-200/80">
      {children}
    </span>
  );
}

export default function OrganizersDirectoryPage() {
  const [rows, setRows] = useState<OrganizerProfileApi[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchOrganizers()
      .then((r) => setRows(r.results))
      .catch(() => setErr("Could not load organizers."));
  }, []);

  return (
    <>
      <PageHero
        eyebrow="find your host"
        title="Organizers"
        subtitle="Browse verified businesses, compare price ranges, and open a profile for full services and tier circles."
        crumbs={[{ label: "Organizers" }]}
        backgroundImage="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80"
      />
      <div className="mx-auto max-w-6xl px-4 pb-24">
        {err && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {err}
          </p>
        )}
        {!err && rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            No organizers published yet. Check back soon.
          </p>
        ) : (
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((o) => {
              const href = `/organizers/${o.user}`;
              const pr = o.price_range;
              const showRange =
                pr &&
                Number.isFinite(pr.min) &&
                Number.isFinite(pr.max) &&
                pr.max > 0;
              const sameBand =
                showRange && Math.abs((pr?.max ?? 0) - (pr?.min ?? 0)) < 1;
              const serviceTypes = o.service_types_preview?.length
                ? o.service_types_preview
                : o.service_preview?.slice(0, 4) ?? [];
              const eventTypes = o.event_types_preview ?? [];
              const count = o.services_count ?? serviceTypes.length;

              return (
                <li key={o.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-espresso-200/12 bg-white shadow-soft ring-1 ring-black/[0.03] transition duration-300 hover:-translate-y-1 hover:border-gold-400/35 hover:shadow-xl">
                    <Link
                      href={href}
                      className="relative block aspect-[16/10] shrink-0 overflow-hidden"
                    >
                      <Image
                        src={photoThumb(o)}
                        alt=""
                        fill
                        className="object-cover transition duration-500 ease-out hover:scale-[1.04]"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-espresso-200/85 via-espresso-200/20 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-serif text-xl text-cream-50 drop-shadow-sm md:text-2xl">
                            {o.company_name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-cream-100/90">
                            {o.display_name ?? "Organizer"}
                            {(o.average_rating ?? 0) > 0 ? (
                              <span className="ml-2 text-gold-300">
                                ★ {(o.average_rating ?? 0).toFixed(1)}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        {count > 0 ? (
                          <span className="shrink-0 rounded-full bg-cream-50/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso-200 shadow-sm">
                            {count} service{count === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <div className="rounded-2xl border border-espresso-200/15 bg-gradient-to-br from-cream-50 to-white px-4 py-3 ring-1 ring-gold-400/15">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-espresso-200/55">
                          Price range
                        </p>
                        <p className="mt-1 font-serif text-lg tabular-nums text-espresso-200">
                          {showRange ? (
                            sameBand ? (
                              formatPKR(pr!.min)
                            ) : (
                              <>
                                {formatPKR(pr!.min)}
                                <span className="mx-1.5 text-gold-600">–</span>
                                {formatPKR(pr!.max)}
                              </>
                            )
                          ) : (
                            <span className="text-base font-sans font-normal text-indigo-900/55">
                              —
                            </span>
                          )}
                        </p>
                      </div>

                      {serviceTypes.length > 0 ? (
                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-800/70">
                            <Sparkles
                              className="h-3 w-3 text-teal-600"
                              aria-hidden
                            />
                            Service type
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {serviceTypes.slice(0, 5).map((t) => (
                              <ServiceTypeChip key={t}>{t}</ServiceTypeChip>
                            ))}
                            {serviceTypes.length > 5 ? (
                              <ServiceTypeChip>
                                +{serviceTypes.length - 5}
                              </ServiceTypeChip>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {eventTypes.length > 0 ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-800/70">
                            Event type
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {eventTypes.slice(0, 6).map((t) => (
                              <EventTypeChip key={t}>{t}</EventTypeChip>
                            ))}
                            {eventTypes.length > 6 ? (
                              <EventTypeChip>
                                +{eventTypes.length - 6}
                              </EventTypeChip>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {o.description ? (
                        <div className="rounded-xl border border-indigo-200/40 bg-indigo-50/80 px-3.5 py-3">
                          <p className="line-clamp-3 text-sm leading-relaxed text-indigo-950/85">
                            {o.description}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-auto pt-2">
                        <Link
                          href={href}
                          className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-sm transition hover:gap-3"
                        >
                          View profile
                          <ArrowRight
                            className="h-4 w-4 shrink-0"
                            aria-hidden
                          />
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
