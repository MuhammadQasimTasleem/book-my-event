"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { OrganizerChatButton } from "@/components/organizer-chat-button";
import PageHero from "@/components/page-hero";
import { fetchAllOrganizers } from "@/lib/api/client";
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

function organizerSearchHaystack(o: OrganizerProfileApi): string {
  return [
    o.company_name,
    o.display_name,
    o.contact_email,
    o.description,
    ...(o.service_types_preview ?? []),
    ...(o.service_preview ?? []),
    ...(o.event_types_preview ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function searchWordsMatch(haystack: string, query: string): boolean {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
  if (words.length === 0) return true;
  return words.every((w) => haystack.includes(w));
}

function priceRangeOverlapsFilter(
  pr: OrganizerProfileApi["price_range"],
  minFilter: number | null,
  maxFilter: number | null
): boolean {
  if (!pr || !Number.isFinite(pr.min) || !Number.isFinite(pr.max)) return false;
  if (minFilter != null && pr.max < minFilter) return false;
  if (maxFilter != null && pr.min > maxFilter) return false;
  return true;
}

export default function OrganizersDirectoryPage() {
  const [rows, setRows] = useState<OrganizerProfileApi[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceMinInput, setPriceMinInput] = useState("");
  const [priceMaxInput, setPriceMaxInput] = useState("");

  useEffect(() => {
    void fetchAllOrganizers()
      .then(setRows)
      .catch(() => setErr("Could not load organizers."));
  }, []);

  const priceMinFilter = useMemo(() => {
    const raw = priceMinInput.replace(/,/g, "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [priceMinInput]);

  const priceMaxFilter = useMemo(() => {
    const raw = priceMaxInput.replace(/,/g, "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [priceMaxInput]);

  const hasPriceFilter = priceMinFilter != null || priceMaxFilter != null;

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim();
    return rows.filter((o) => {
      if (q && !searchWordsMatch(organizerSearchHaystack(o), q)) return false;
      if (hasPriceFilter) {
        if (!priceRangeOverlapsFilter(o.price_range, priceMinFilter, priceMaxFilter))
          return false;
      }
      return true;
    });
  }, [rows, searchQuery, hasPriceFilter, priceMinFilter, priceMaxFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setPriceMinInput("");
    setPriceMaxInput("");
  };

  const filtersActive =
    searchQuery.trim() !== "" || priceMinInput.trim() !== "" || priceMaxInput.trim() !== "";

  return (
    <>
      <PageHero
        eyebrow="find your host"
        title="Organizers"
        subtitle="Every approved host is listed below. Search narrows the list; clear the box to see everyone again."
        crumbs={[{ label: "Organizers" }]}
        backgroundImage="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80"
      />
      <div className="mx-auto max-w-6xl px-4 pb-24">
        {err && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {err}
          </p>
        )}
        {!err && rows.length > 0 ? (
          <div className="mb-10 rounded-2xl border border-espresso-200/12 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-center gap-2 border-b border-espresso-200/10 pb-4">
              <SlidersHorizontal
                className="h-4 w-4 text-espresso-200/70"
                aria-hidden
              />
              <h2 className="font-serif text-lg text-espresso-200">
                Find organizers
              </h2>
              <p className="w-full text-sm text-muted sm:ml-auto sm:w-auto">
                By default you see <strong>all</strong> organizers. Search by
                company, name, services, or event types — only matching profiles
                stay visible. Optional price band (PKR) narrows further.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
              <label className="relative block flex-1 min-w-[200px]">
                <span className="sr-only">Search organizers</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  className="input w-full pl-10"
                  placeholder="e.g. decoration, catering, Ali, company name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-3 sm:items-end">
                <div>
                  <label className="label text-[10px] uppercase tracking-wider text-muted">
                    Min price (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input mt-1 w-36 tabular-nums"
                    placeholder="Any"
                    value={priceMinInput}
                    onChange={(e) => setPriceMinInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label text-[10px] uppercase tracking-wider text-muted">
                    Max price (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input mt-1 w-36 tabular-nums"
                    placeholder="Any"
                    value={priceMaxInput}
                    onChange={(e) => setPriceMaxInput(e.target.value)}
                  />
                </div>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={() => clearFilters()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-espresso-200/20 px-3 py-2.5 text-xs font-medium text-espresso-200 transition hover:bg-cream-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            {filtersActive ? (
              <p className="mt-3 text-xs text-muted">
                Filtered: <strong>{filteredRows.length}</strong> of {rows.length}{" "}
                organizer{rows.length === 1 ? "" : "s"} match your search / price
                settings
                {filteredRows.length === 0
                  ? " — try clearing filters or different keywords."
                  : "."}
              </p>
            ) : rows.length > 0 ? (
              <p className="mt-3 text-xs text-muted">
                Showing <strong>all {rows.length}</strong> organizer
                {rows.length === 1 ? "" : "s"}. Use search or price to narrow the
                list.
              </p>
            ) : null}
          </div>
        ) : null}
        {!err && rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            No organizers published yet. Check back soon.
          </p>
        ) : null}
        {!err && rows.length > 0 && filteredRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            No organizers match your filters.{" "}
            <button
              type="button"
              onClick={() => clearFilters()}
              className="font-medium text-gold-600 underline decoration-gold-400/50"
            >
              Clear filters
            </button>
          </p>
        ) : null}
        {!err && rows.length > 0 && filteredRows.length > 0 ? (
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((o) => {
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

                      <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:items-stretch">
                        <Link
                          href={href}
                          className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-sm transition hover:gap-3"
                        >
                          View profile
                          <ArrowRight
                            className="h-4 w-4 shrink-0"
                            aria-hidden
                          />
                        </Link>
                        <OrganizerChatButton
                          organizerUserId={o.user}
                          compact
                          className="flex-1 py-3.5"
                        />
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="group fixed bottom-6 left-6 z-40">
          <div className="pointer-events-none absolute bottom-full left-0 mb-3 w-[min(20rem,calc(100vw-3rem))] translate-y-2 rounded-2xl border border-espresso-200/15 bg-white/98 p-4 opacity-0 shadow-[0_16px_40px_rgba(62,47,35,0.16)] ring-1 ring-gold-400/20 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
              Custom Event
            </p>
            <p className="mt-2 text-sm font-semibold text-espresso-200">
              Build one event across multiple organizers
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Add services from different organizers to one plan, review the total
              bill, and submit all requests together.
            </p>
          </div>
          <Link
            href="/book-event"
            className="inline-flex items-center gap-3 rounded-2xl border-2 border-gold-500/80 bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-3.5 text-sm font-semibold text-espresso-950 shadow-[0_14px_32px_rgba(181,140,44,0.28)] ring-1 ring-gold-600/25 transition hover:-translate-y-0.5 hover:border-gold-600 hover:shadow-[0_18px_38px_rgba(181,140,44,0.34)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/65 shadow-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-gold-700" aria-hidden />
            </span>
            <span className="whitespace-nowrap">Plan a custom event</span>
          </Link>
        </div>
      </div>
    </>
  );
}
