"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  fetchOrganizerProfileByUserId,
  fetchServices,
} from "@/lib/api/client";
import type { OrganizerProfileApi, ServiceApi } from "@/lib/api/types";
import { API_ORIGIN } from "@/lib/config";
import { formatPKR } from "@/lib/data";
import { mapServiceApiToCard } from "@/lib/map-service";
import { OrganizerChatButton } from "@/components/organizer-chat-button";
import { serviceListingLabel } from "@/lib/service-presets";

function absUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = API_ORIGIN.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

const TIER_DISPLAY: { key: "normal" | "moderate" | "luxury"; label: string }[] = [
  { key: "normal", label: "Simple" },
  { key: "moderate", label: "Moderate" },
  { key: "luxury", label: "Luxury" },
];

function tierUnitPrice(s: ServiceApi, tier: "normal" | "moderate" | "luxury"): number {
  const tp = s.tier_prices ?? {};
  const raw = tp[tier];
  if (raw != null && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return Number(s.price);
}

function eventTypesDisplay(s: ServiceApi): string {
  const list = s.event_types?.filter(Boolean) ?? [];
  if (list.length) return list.join(" · ");
  return (s.event_type || "").trim() || "—";
}

function pricingUnitLabel(s: ServiceApi): string {
  return s.pricing_unit === "per_guest" ? "per guest" : "per event";
}

export default function OrganizerPublicProfilePage() {
  const params = useParams();
  const userId = Number(params.userId);
  const [profile, setProfile] = useState<OrganizerProfileApi | null>(null);
  const [services, setServices] = useState<ServiceApi[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(userId)) {
      setErr("Invalid organizer.");
      return;
    }
    void (async () => {
      try {
        const p = await fetchOrganizerProfileByUserId(userId, { auth: false });
        setProfile(p);
        const svc = await fetchServices({ organizer: String(userId) });
        setServices(svc.results);
      } catch {
        setErr("This organizer could not be found or is not public yet.");
      }
    })();
  }, [userId]);

  if (err) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </p>
        <Link
          href="/organizers"
          className="mt-6 inline-block text-sm text-gold-500 hover:underline"
        >
          ← All organizers
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-24 text-center text-sm text-muted">Loading…</div>
    );
  }

  const cover =
    absUrl(profile.event_photos?.[0]?.image) ||
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=2000&q=80";

  return (
    <div>
      <div className="relative h-[min(42vh,420px)] w-full bg-espresso-200">
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover opacity-90"
          loading="eager"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso-200 via-espresso-200/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-4xl px-4 pb-10 text-cream-50">
          <Link
            href="/organizers"
            className="text-xs font-medium uppercase tracking-[0.18em] text-cream-100/90 hover:text-cream-50"
          >
            ← Organizers
          </Link>
          <h1 className="mt-3 font-serif text-4xl text-cream-50 md:text-5xl">
            {profile.company_name}
          </h1>
          <p className="mt-2 text-sm text-cream-100/90">
            {profile.display_name}
            {(profile.average_rating ?? 0) > 0 ? (
              <span className="ml-2 text-gold-300">
                ★ {(profile.average_rating ?? 0).toFixed(1)}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12">
        {profile.description ? (
          <section>
            <h2 className="font-serif text-2xl text-espresso-200">About</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-espresso-200/90">
              {profile.description}
            </p>
          </section>
        ) : null}

        <section className="flex flex-wrap items-center gap-3">
          <Link href={`/organizers/${userId}/book`} className="btn-primary">
            Book an event
          </Link>
          <OrganizerChatButton organizerUserId={userId} />
          <Link
            href="/package-builder"
            className="btn-ghost border border-espresso-200/20"
          >
            Budget estimator
          </Link>
        </section>

        {profile.event_photos && profile.event_photos.length > 0 ? (
          <section>
            <h2 className="font-serif text-2xl text-espresso-200">Portfolio</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {profile.event_photos.map((ph) => {
                const src = absUrl(ph.image);
                if (!src) return null;
                return (
                  <li
                    key={ph.id}
                    className="overflow-hidden rounded-2xl border border-espresso-200/10 bg-cream-50/50 shadow-soft"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={src}
                        alt={ph.caption || "Portfolio"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    {ph.caption ? (
                      <p className="p-3 text-xs text-muted">{ph.caption}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="font-serif text-2xl text-espresso-200">Services</h2>
          <p className="mt-1 text-sm text-muted">
            Each listing is on its own card with a circular photo. Tap to expand —
            you&apos;ll see a corner image and <strong>Simple</strong>,{" "}
            <strong>Moderate</strong>, and <strong>Luxury</strong> prices in rings.
            Service type and event types are shown separately.
          </p>
          {services.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No services listed yet.</p>
          ) : (
            <ul className="mt-8 flex flex-col gap-8">
              {services.map((s) => {
                const open = expandedServiceId === s.id;
                const thumbSrc = mapServiceApiToCard(s).image;
                const listingTitle = serviceListingLabel(s);
                const serviceType =
                  (s.service_type || "").trim() ||
                  (s.category_name || "").trim() ||
                  "Service";
                const events = eventTypesDisplay(s);
                const unitNote = pricingUnitLabel(s);
                const fromPrice = tierUnitPrice(s, "normal");
                const unit = tierUnitPrice(s, "moderate");
                const pricingWarning =
                  !Number.isFinite(unit) || unit <= 0;

                return (
                  <li key={s.id} className="list-none">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedServiceId((id) => (id === s.id ? null : s.id))
                      }
                      className={`group relative w-full rounded-[2rem] border-2 bg-white p-6 text-left shadow-soft transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 ${
                        open
                          ? "border-gold-400/70 shadow-gold ring-1 ring-gold-400/30"
                          : "border-espresso-200/15 hover:-translate-y-1 hover:border-gold-400/55 hover:shadow-xl"
                      }`}
                    >
                      <div className="flex gap-5">
                        <div
                          className={`relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full ring-4 transition-all duration-300 sm:h-[5.25rem] sm:w-[5.25rem] ${
                            open
                              ? "ring-gold-400/80 shadow-md"
                              : "ring-cream-200 group-hover:ring-gold-400/50 group-hover:shadow-md"
                          }`}
                        >
                          <Image
                            src={thumbSrc}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="84px"
                          />
                        </div>

                        <div className="min-w-0 flex-1 pr-8 sm:pr-28">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-lg leading-snug text-espresso-200 sm:text-xl">
                              {listingTitle}
                            </h3>
                            <ChevronDown
                              className={`mt-1 h-5 w-5 shrink-0 text-gold-500 transition-transform duration-300 ${
                                open ? "rotate-180" : ""
                              }`}
                              aria-hidden
                            />
                          </div>

                          <p className="mt-2 text-xs text-muted">{s.location}</p>

                          <div className="mt-4 space-y-2 border-t border-espresso-200/10 pt-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-800/70">
                              Service type
                            </p>
                            <p className="text-sm font-medium text-espresso-200">
                              {serviceType}
                            </p>
                          </div>

                          <div className="mt-4 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-800/70">
                              Event types
                            </p>
                            <p className="text-sm leading-relaxed text-espresso-200/90">
                              {events}
                            </p>
                          </div>

                          {!open ? (
                            <p className="mt-4 text-xs text-muted">
                              From{" "}
                              <span className="font-medium text-gold-600">
                                {formatPKR(fromPrice)}
                              </span>{" "}
                              <span className="text-muted">({unitNote})</span>
                              {" · "}
                              <span className="text-gold-600/90">
                                Tap for tier rings
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {pricingWarning ? (
                        <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-50/90 px-4 py-2 text-left text-[11px] font-medium text-amber-950">
                          No rate on file for some tiers — open edit listing to set
                          tier prices.
                        </p>
                      ) : null}

                      {open ? (
                        <>
                          <div className="pointer-events-none absolute right-5 top-5 hidden overflow-hidden rounded-2xl border-2 border-white shadow-lg ring-2 ring-espresso-200/10 sm:block sm:h-28 sm:w-28">
                            <Image
                              src={thumbSrc}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="112px"
                            />
                          </div>

                          <div className="mt-6 border-t border-dashed border-espresso-200/20 pt-6">
                            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                              Prices by tier ({unitNote})
                            </p>
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-5 sm:gap-8">
                              {TIER_DISPLAY.map(({ key, label }) => {
                                const priceU = tierUnitPrice(s, key);
                                return (
                                  <div
                                    key={key}
                                    className="flex flex-col items-center gap-2"
                                  >
                                    <div
                                      className={`flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full border-2 bg-gradient-to-b px-2 text-center shadow-inner transition-transform duration-300 hover:scale-105 sm:h-[6.25rem] sm:w-[6.25rem] ${
                                        key === "luxury"
                                          ? "border-amber-400/60 from-amber-50/90 to-white"
                                          : key === "moderate"
                                            ? "border-gold-400/60 from-gold-50/80 to-white"
                                            : "border-espresso-200/35 from-cream-50 to-white"
                                      }`}
                                    >
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-espresso-200/65">
                                        {label}
                                      </span>
                                      <span className="mt-1 font-serif text-sm font-semibold leading-tight text-espresso-200 sm:text-base">
                                        {formatPKR(priceU)}
                                      </span>
                                    </div>
                                    {s.pricing_unit === "per_guest" ? (
                                      <span className="max-w-[6rem] text-center text-[10px] text-muted">
                                        unit / guest
                                      </span>
                                    ) : (
                                      <span className="max-w-[6rem] text-center text-[10px] text-muted">
                                        flat / event
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="relative mt-6 flex justify-center sm:hidden">
                            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-gold-400/40 shadow-md ring-2 ring-white">
                              <Image
                                src={thumbSrc}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            </div>
                          </div>
                        </>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
