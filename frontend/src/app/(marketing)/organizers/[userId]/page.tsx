"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import {
  fetchOrganizerProfileByUserId,
  fetchServices,
} from "@/lib/api/client";
import type { OrganizerProfileApi, ServiceApi } from "@/lib/api/types";
import { useEventBookingCart } from "@/components/event-booking-cart-provider";
import { API_ORIGIN } from "@/lib/config";
import {
  TIER_LABELS,
  buildEventCartLine,
  type EventCartTier,
} from "@/lib/event-cart";
import { formatPKR } from "@/lib/data";
import { mapServiceApiToCard } from "@/lib/map-service";
import { OrganizerChatButton } from "@/components/organizer-chat-button";
import { DirectServiceBookingModal } from "@/components/direct-service-booking-modal";
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

function tierDetailText(
  s: ServiceApi,
  tier: "normal" | "moderate" | "luxury"
): string {
  const details = s.tier_details ?? {};
  return String(details[tier] ?? "").trim();
}

function tierImageSrc(
  s: ServiceApi,
  tier: "normal" | "moderate" | "luxury"
): string | null {
  const images = s.tier_images ?? {};
  return absUrl(String(images[tier] ?? "").trim());
}

function eventTypesDisplay(s: ServiceApi): string {
  const list = s.event_types?.filter(Boolean) ?? [];
  if (list.length) return list.join(" · ");
  return (s.event_type || "").trim() || "—";
}

function pricingUnitLabel(s: ServiceApi): string {
  return s.pricing_unit === "per_guest" ? "per guest" : "per event";
}

function OrganizerPublicProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const userId = Number(params.userId);
  const { lines, addLine, removeLine, setLineTier } = useEventBookingCart();
  const [profile, setProfile] = useState<OrganizerProfileApi | null>(null);
  const [services, setServices] = useState<ServiceApi[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [tierByService, setTierByService] = useState<
    Record<number, EventCartTier>
  >({});
  const [previewTierByService, setPreviewTierByService] = useState<
    Record<number, EventCartTier>
  >({});
  const [lightbox, setLightbox] = useState<{
    src: string;
    label: string;
  } | null>(null);
  const [directBookService, setDirectBookService] = useState<ServiceApi | null>(
    null
  );

  const tierFor = (serviceId: number): EventCartTier =>
    tierByService[serviceId] ?? "moderate";
  const previewTierFor = (serviceId: number): EventCartTier =>
    previewTierByService[serviceId] ?? "moderate";

  useEffect(() => {
    if (!Number.isFinite(userId)) {
      setErr("Invalid organizer.");
      return;
    }
    void (async () => {
      try {
        const p = await fetchOrganizerProfileByUserId(userId, { auth: false });
        setProfile(p);
        const svc = await fetchServices({
          organizer: String(userId),
          ordering: "-updated_at",
        });
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
    <div className="pb-28 sm:pb-24">
      {lightbox ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-espresso-950/75 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${lightbox.label} image preview`}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close image preview"
            onClick={() => setLightbox(null)}
          />
          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-espresso-200/10 px-4 py-3">
              <p className="text-sm font-semibold text-espresso-200">
                {lightbox.label}
              </p>
              <button
                type="button"
                className="rounded-full border border-espresso-200/15 p-2 text-espresso-200 transition hover:bg-cream-50"
                onClick={() => setLightbox(null)}
                aria-label="Close image preview"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="bg-cream-50 p-3 sm:p-4">
              <img
                src={lightbox.src}
                alt={lightbox.label}
                className="max-h-[78vh] w-full rounded-2xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
      <DirectServiceBookingModal
        open={directBookService !== null}
        onClose={() => setDirectBookService(null)}
        service={directBookService}
        organizerCompanyName={profile.company_name}
        listingTitle={
          directBookService
            ? serviceListingLabel(directBookService)
            : ""
        }
        tier={
          directBookService
            ? tierFor(directBookService.id)
            : "moderate"
        }
      />
      {returnTo ? (
        <div className="border-b border-gold-400/40 bg-gold-200/50 px-4 py-3 text-center text-sm text-espresso-900">
          <Link
            href={returnTo}
            className="font-semibold text-espresso-950 underline decoration-espresso-400/60 underline-offset-2 hover:text-espresso-800"
          >
            ← Back to package builder
          </Link>
          <span className="text-espresso-800/80">
            {" "}
            — your selections and budget are restored from this browser tab.
          </span>
        </div>
      ) : null}
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
          <Link
            href="/book-event"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gold-400/70 bg-gold-50/90 px-4 py-2.5 text-sm font-semibold text-espresso-900 shadow-sm transition hover:border-gold-500 hover:bg-gold-100"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-gold-600" aria-hidden />
            Plan a custom event
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
                const previewTier = previewTierFor(s.id);
                const previewDetail = tierDetailText(s, previewTier);
                const previewImage = tierImageSrc(s, previewTier) || thumbSrc;
                const pricingWarning =
                  !Number.isFinite(unit) || unit <= 0;

                const inCart = lines.some((l) => l.serviceId === s.id);
                const canAdd =
                  s.availability && !pricingWarning && Number.isFinite(unit) && unit > 0;

                return (
                  <li key={s.id} className="list-none">
                    <div
                      className={`group relative w-full overflow-hidden rounded-[2rem] border-2 bg-white text-left shadow-soft transition-all duration-300 ${
                        open
                          ? "border-gold-400/70 shadow-gold ring-1 ring-gold-400/30"
                          : "border-espresso-200/15 hover:-translate-y-1 hover:border-gold-400/55 hover:shadow-xl"
                      }`}
                    >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedServiceId((id) => (id === s.id ? null : s.id))
                      }
                      className="group relative w-full p-6 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400"
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
                    </button>

                    {open ? (
                      <div className="relative px-6 pb-6">
                        <div className="border-t border-dashed border-espresso-200/20 pt-6">
                          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                            Prices by tier ({unitNote})
                          </p>
                          <div className="mt-5 flex flex-wrap items-center justify-center gap-5 sm:gap-8">
                            {TIER_DISPLAY.map(({ key, label }) => {
                              const priceU = tierUnitPrice(s, key);
                              const active = previewTier === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() =>
                                    setPreviewTierByService((prev) => ({
                                      ...prev,
                                      [s.id]: key,
                                    }))
                                  }
                                  className="flex flex-col items-center gap-2"
                                >
                                  <div
                                    className={`flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full border-2 bg-gradient-to-b px-2 text-center shadow-inner transition-transform duration-300 hover:scale-105 sm:h-[6.25rem] sm:w-[6.25rem] ${
                                      key === "luxury"
                                        ? "border-amber-400/60 from-amber-50/90 to-white"
                                        : key === "moderate"
                                          ? "border-gold-400/60 from-gold-50/80 to-white"
                                          : "border-espresso-200/35 from-cream-50 to-white"
                                    } ${active ? "ring-4 ring-gold-300/40" : ""}`}
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
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start">
                            {previewDetail ? (
                              <div className="rounded-2xl border border-espresso-200/12 bg-cream-50/70 px-4 py-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                                  {TIER_LABELS[previewTier]} details
                                </p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-espresso-200/90">
                                  {previewDetail}
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-espresso-200/12 bg-cream-50/70 px-4 py-4">
                                <p className="text-xs text-muted">
                                  No extra details added yet for{" "}
                                  {TIER_LABELS[previewTier].toLowerCase()}.
                                </p>
                              </div>
                            )}
                            <button
                              type="button"
                              className="group relative mx-auto h-28 w-28 overflow-hidden rounded-2xl border-2 border-white shadow-lg ring-2 ring-espresso-200/10 transition hover:scale-[1.02] sm:mx-0 sm:h-40 sm:w-40"
                              onClick={() =>
                                setLightbox({
                                  src: previewImage,
                                  label: `${listingTitle} · ${TIER_LABELS[previewTier]}`,
                                })
                              }
                              aria-label={`Open ${TIER_LABELS[previewTier]} image`}
                            >
                              <Image
                                src={previewImage}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="160px"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso-950/70 to-transparent px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-50 opacity-90 transition group-hover:opacity-100">
                                Tap to enlarge
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t border-espresso-200/12 bg-cream-50/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Tier for your plan
                        </span>
                        <select
                          className="input max-w-[11rem] py-2 text-sm"
                          value={inCart ? lines.find((l) => l.serviceId === s.id)?.tier ?? tierFor(s.id) : tierFor(s.id)}
                          onChange={(e) => {
                            const t = e.target.value as EventCartTier;
                            setTierByService((m) => ({ ...m, [s.id]: t }));
                            if (inCart) setLineTier(s.id, t);
                          }}
                          aria-label="Tier for event plan"
                        >
                          {(Object.keys(TIER_LABELS) as EventCartTier[]).map(
                            (k) => (
                              <option key={k} value={k}>
                                {TIER_LABELS[k]}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {inCart ? (
                          <button
                            type="button"
                            onClick={() => removeLine(s.id)}
                            className="rounded-xl border border-espresso-200/25 bg-white px-4 py-2.5 text-sm font-medium text-espresso-200 shadow-sm hover:bg-cream-50"
                          >
                            Remove from plan
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAdd}
                            onClick={() =>
                              addLine(
                                buildEventCartLine(
                                  s,
                                  tierFor(s.id),
                                  profile.company_name,
                                  listingTitle
                                )
                              )
                            }
                            className="rounded-xl border border-gold-400/60 bg-white px-4 py-2.5 text-sm font-semibold text-gold-900 shadow-sm transition hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Add to event plan
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canAdd}
                          onClick={() => setDirectBookService(s)}
                          className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-espresso-950 shadow-sm transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Submit request now
                        </button>
                        <Link
                          href="/book-event"
                          className="inline-flex items-center justify-center rounded-xl border border-espresso-200/25 px-4 py-2.5 text-sm font-medium text-espresso-200 hover:bg-cream-50"
                        >
                          View cart
                        </Link>
                      </div>
                    </div>
                    </div>
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

export default function OrganizerProfilePageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-sm text-muted">Loading…</div>
      }
    >
      <OrganizerPublicProfilePage />
    </Suspense>
  );
}
