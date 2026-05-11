"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calculator,
  CheckCircle2,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { API_BASE } from "@/lib/config";
import type { BudgetBreakdownLine, ServiceApi } from "@/lib/api/types";
import {
  budgetEstimate,
  createBooking,
  createClientEvent,
  createPackage,
  createPackageItem,
  deletePackageItem,
  fetchMe,
  getStoredTokens,
  patchPackage,
} from "@/lib/api/client";
import {
  EVENT_PRESET_OPTIONS,
  resolveEventType,
  serviceListingLabel,
  type EventPresetKey,
} from "@/lib/service-presets";
import { mapServiceApiToCard } from "@/lib/map-service";
import {
  eventCategoryGroups,
  slugifyCategoryName,
} from "@/lib/event-categories";
import { formatPKR, type Service } from "@/lib/data";
import { isClientUser, normalizeUserMe } from "@/lib/auth-roles";
import { useActiveClientEvent } from "@/components/active-client-event-provider";
import { useAuth } from "@/components/providers";

const PB_SNAPSHOT_KEY = "bme_pb_snapshot_v1";

type PackageBuilderSnapshotV1 = {
  v: 1;
  selectedIds: number[];
  selectedFamilyIds: string[];
  selectedTypeKeys: string[];
  packageId: number | null;
  itemByService: Record<string, number>;
  tier: "normal" | "moderate" | "luxury";
  guests: number;
  eventDate: string;
  eventCity: string;
  serviceSearch: string;
  packageNotes: string;
  eventPreset: EventPresetKey;
  eventTypeOther: string;
};

function resolveInitialGroupId(id?: string) {
  if (id && eventCategoryGroups.some((g) => g.id === id)) return id;
  return eventCategoryGroups[0].id;
}

const ALL_FAMILY_OFFERINGS_KEY = "__all__";

type OrganizerOfferTypeOption = {
  key: string;
  label: string;
  kind: "all" | "taxonomy" | "custom" | "organizer_type";
  leafSlug?: string;
};

function leafSlugSetForGroup(
  group: (typeof eventCategoryGroups)[number]
): Set<string> {
  return new Set(group.items.map((i) => slugifyCategoryName(i.name)));
}

const FAMILY_MATCH_STOPWORDS = new Set([
  "services",
  "service",
  "event",
  "events",
  "the",
  "and",
  "for",
  "with",
  "a",
  "an",
]);

function tokenizePhrase(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((w) => w.trim())
    .filter(Boolean);
}

/** Same fields organizers see on profiles — not only `category_slug`. */
function serviceOfferKeywordHaystack(s: ServiceApi): string {
  return [
    s.service_type,
    s.offering_label,
    s.title,
    s.description,
    s.category_name,
    s.category_slug,
    s.event_type,
    ...(s.event_types ?? []),
    s.organizer_name,
    s.location,
    ...(s.included_amenities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function groupAnchorTokens(group: (typeof eventCategoryGroups)[number]): string[] {
  const raw = group.name
    .toLowerCase()
    .replace(/\b(services?|service)\b/gi, " ")
    .trim();
  return tokenizePhrase(raw).filter(
    (w) => !FAMILY_MATCH_STOPWORDS.has(w) && w.length > 2
  );
}

/**
 * Listing belongs to the selected family: seeded category OR text overlap with
 * family name / leaf labels (matches how organizers tag `service_type`).
 */
function serviceMatchesFamilyBroad(
  s: ServiceApi,
  group: (typeof eventCategoryGroups)[number]
): boolean {
  const leafSlugs = leafSlugSetForGroup(group);
  if (s.category_slug && leafSlugs.has(s.category_slug)) return true;
  const hay = serviceOfferKeywordHaystack(s);
  for (const t of groupAnchorTokens(group)) {
    if (hay.includes(t)) return true;
  }
  for (const item of group.items) {
    const words = tokenizePhrase(item.name).filter(
      (w) => !FAMILY_MATCH_STOPWORDS.has(w) && w.length > 2
    );
    if (words.length > 0 && words.every((w) => hay.includes(w))) return true;
    const leafNorm = item.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (leafNorm.length > 4 && hay.includes(leafNorm)) return true;
  }
  return false;
}

function significantWords(label: string): string[] {
  return tokenizePhrase(label).filter((w) => w.length > 1);
}

function matchesOfferTypeWords(tagLabel: string, s: ServiceApi): boolean {
  const words = significantWords(tagLabel);
  if (words.length === 0) return true;
  const hay = serviceOfferKeywordHaystack(s);
  return words.every((w) => hay.includes(w));
}

function serviceMatchesSelectedFamilies(
  s: ServiceApi,
  selectedFamilyIds: string[]
): boolean {
  if (selectedFamilyIds.length === 0) return true;
  for (const id of selectedFamilyIds) {
    const g = eventCategoryGroups.find((x) => x.id === id);
    if (g && serviceMatchesFamilyBroad(s, g)) return true;
  }
  return false;
}

function unitPerGuest(s: ServiceApi): boolean {
  return (s.pricing_unit ?? "per_event") === "per_guest";
}

/** Aligned with `mapServiceApiToCard` (`per head` vs API `per_guest`). */
function cardIsPerGuest(s: Service): boolean {
  return s.unit === "per head" || s.unit === "per guest";
}

function quantityFor(s: ServiceApi, guests: number): number {
  return unitPerGuest(s) ? Math.max(1, guests) : 1;
}

function lineHasSpread(row: BudgetBreakdownLine): boolean {
  if (row.unavailable) return false;
  const lo = row.min_price ?? row.estimated_price ?? 0;
  const hi = row.max_price ?? row.estimated_price ?? 0;
  return hi > lo + 0.5;
}

function unavailableLineHint(row: BudgetBreakdownLine): string {
  if (!row.unavailable) return "";
  if (row.unavailable_reason === "not_offered")
    return "Not offered by organizer — no rate applied.";
  if (row.unavailable_reason === "no_rate")
    return "No rate for this tier — excluded from total.";
  return "Unavailable — excluded from total.";
}

function unitPriceForTier(
  s: ServiceApi,
  tierState: "normal" | "moderate" | "luxury"
): number {
  const tp = s.tier_prices ?? {};
  const raw = tp[tierState];
  if (raw != null && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return Number(s.price);
}

export default function PackageBuilder({
  initialGroupId,
}: {
  initialGroupId?: string;
}) {
  const { user, loading: authLoading, ready } = useAuth();
  const {
    activeEvent,
    setActiveEvent,
    hydrated: eventCtxHydrated,
  } = useActiveClientEvent();
  const router = useRouter();
  const [rows, setRows] = useState<ServiceApi[]>([]);
  /** Empty = all service families (no family filter). */
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>(() => {
    const gid = resolveInitialGroupId(initialGroupId);
    return [gid];
  });
  /** Empty = all type tags (no type filter). */
  const [selectedTypeKeys, setSelectedTypeKeys] = useState<string[]>([]);

  const primaryGroup = useMemo(() => {
    const firstId = selectedFamilyIds[0];
    if (firstId) {
      return (
        eventCategoryGroups.find((g) => g.id === firstId) ??
        eventCategoryGroups[0]
      );
    }
    return eventCategoryGroups[0];
  }, [selectedFamilyIds]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemByService, setItemByService] = useState<Record<number, number>>({});
  const [packageId, setPackageId] = useState<number | null>(null);
  const [eventDate, setEventDate] = useState<string>("");
  const [eventCity, setEventCity] = useState<string>("");
  const [guests, setGuests] = useState<number>(150);
  const [estimateTotal, setEstimateTotal] = useState<number | null>(null);
  const [estimateMin, setEstimateMin] = useState<number | null>(null);
  const [estimateMax, setEstimateMax] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [breakdown, setBreakdown] = useState<BudgetBreakdownLine[]>([]);
  const [tier, setTier] = useState<"normal" | "moderate" | "luxury">("moderate");
  const [packageNotes, setPackageNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [eventPreset, setEventPreset] = useState<EventPresetKey>("wedding");
  const [eventTypeOther, setEventTypeOther] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [pbNewEventTitle, setPbNewEventTitle] = useState("");
  const [pbCreatingEvent, setPbCreatingEvent] = useState(false);

  const resolvedEventType = resolveEventType(eventPreset, eventTypeOther);

  useEffect(() => {
    const gid = resolveInitialGroupId(initialGroupId);
    setSelectedFamilyIds([gid]);
    setSelectedTypeKeys([]);
  }, [initialGroupId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("resume") !== "1") return;
    const raw = sessionStorage.getItem(PB_SNAPSHOT_KEY);
    if (!raw) {
      window.history.replaceState(null, "", "/package-builder");
      return;
    }
    try {
      const s = JSON.parse(raw) as PackageBuilderSnapshotV1;
      if (Array.isArray(s.selectedIds)) setSelectedIds(s.selectedIds);
      if (Array.isArray(s.selectedFamilyIds))
        setSelectedFamilyIds(s.selectedFamilyIds);
      if (Array.isArray(s.selectedTypeKeys))
        setSelectedTypeKeys(s.selectedTypeKeys);
      if (s.packageId != null) setPackageId(s.packageId);
      if (s.itemByService && typeof s.itemByService === "object") {
        setItemByService(
          Object.fromEntries(
            Object.entries(s.itemByService).map(([k, v]) => [
              Number(k),
              Number(v),
            ])
          ) as Record<number, number>
        );
      }
      if (s.tier === "normal" || s.tier === "moderate" || s.tier === "luxury")
        setTier(s.tier);
      if (typeof s.guests === "number") setGuests(Math.max(1, s.guests));
      if (typeof s.eventDate === "string") setEventDate(s.eventDate);
      if (typeof s.eventCity === "string") setEventCity(s.eventCity);
      if (typeof s.serviceSearch === "string") setServiceSearch(s.serviceSearch);
      if (typeof s.packageNotes === "string") setPackageNotes(s.packageNotes);
      if (
        s.eventPreset &&
        EVENT_PRESET_OPTIONS.some((o) => o.key === s.eventPreset)
      )
        setEventPreset(s.eventPreset);
      if (typeof s.eventTypeOther === "string")
        setEventTypeOther(s.eventTypeOther);
    } catch {
      /* ignore corrupt snapshot */
    }
    sessionStorage.removeItem(PB_SNAPSHOT_KEY);
    window.history.replaceState(null, "", "/package-builder");
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/services/?page_size=500`)
      .then((r) => r.json())
      .then((d: { results?: ServiceApi[] }) => setRows(d.results ?? []))
      .catch(() => setRows([]));
  }, []);

  /** Listings organizers currently publish as available (browse-only; no editing here). */
  const organizerOfferings = useMemo(
    () => rows.filter((r) => r.availability === true),
    [rows]
  );

  const baseOfferings = useMemo(
    () =>
      organizerOfferings.filter((s) =>
        serviceMatchesSelectedFamilies(s, selectedFamilyIds)
      ),
    [organizerOfferings, selectedFamilyIds]
  );

  const groupsForTaxonomy = useMemo(() => {
    if (selectedFamilyIds.length > 0) {
      return selectedFamilyIds
        .map((id) => eventCategoryGroups.find((g) => g.id === id))
        .filter(Boolean) as (typeof eventCategoryGroups)[number][];
    }
    return eventCategoryGroups;
  }, [selectedFamilyIds]);

  const organizerOfferTypeOptions = useMemo((): OrganizerOfferTypeOption[] => {
    const opts: OrganizerOfferTypeOption[] = [
      {
        key: ALL_FAMILY_OFFERINGS_KEY,
        label: "All type tags",
        kind: "all",
      },
    ];
    if (baseOfferings.length === 0) return opts;

    const stSet = new Map<string, string>();
    for (const s of baseOfferings) {
      const st = (s.service_type ?? "").trim();
      if (st) stSet.set(st.toLowerCase(), st);
    }
    const serviceTypesSorted = [...stSet.values()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    const seenTaxSlugs = new Set<string>();
    const taxonomyLeaves: { slug: string; label: string }[] = [];
    for (const group of groupsForTaxonomy) {
      for (const item of group.items) {
        const slug = slugifyCategoryName(item.name);
        if (seenTaxSlugs.has(slug)) continue;
        if (baseOfferings.some((s) => s.category_slug === slug)) {
          seenTaxSlugs.add(slug);
          taxonomyLeaves.push({ slug, label: item.name });
        }
      }
    }

    const usedTaxonomyLabels = new Set(
      taxonomyLeaves.map((t) => t.label.trim().toLowerCase())
    );
    const usedStLower = new Set(serviceTypesSorted.map((x) => x.toLowerCase()));

    const customLabels = new Map<string, string>();
    for (const s of baseOfferings) {
      const ol = (s.offering_label ?? "").trim();
      if (ol) {
        const k = ol.toLowerCase();
        if (!usedTaxonomyLabels.has(k) && !usedStLower.has(k))
          customLabels.set(k, ol);
      }
      const title = (s.title ?? "").trim();
      const st = (s.service_type ?? "").trim();
      if (
        title &&
        title.toLowerCase() !== ol.toLowerCase() &&
        title.toLowerCase() !== st.toLowerCase() &&
        !usedTaxonomyLabels.has(title.toLowerCase()) &&
        !usedStLower.has(title.toLowerCase())
      ) {
        customLabels.set(title.toLowerCase(), title);
      }
    }
    const customSorted = [...customLabels.values()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    for (const label of serviceTypesSorted) {
      let key = `stype:${slugifyCategoryName(label)}`;
      let n = 0;
      while (opts.some((o) => o.key === key)) {
        n += 1;
        key = `stype:${slugifyCategoryName(label)}-${n}`;
      }
      opts.push({
        key,
        label,
        kind: "organizer_type",
      });
    }
    for (const t of taxonomyLeaves.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    )) {
      opts.push({
        key: `tax:${t.slug}`,
        label: t.label,
        kind: "taxonomy",
        leafSlug: t.slug,
      });
    }
    const usedCustKeys = new Set<string>();
    for (const label of customSorted) {
      let key = `cust:${slugifyCategoryName(label)}`;
      let n = 0;
      while (usedCustKeys.has(key) || opts.some((o) => o.key === key)) {
        n += 1;
        key = `cust:${slugifyCategoryName(label)}-${n}`;
      }
      usedCustKeys.add(key);
      opts.push({ key, label, kind: "custom" });
    }
    return opts;
  }, [baseOfferings, groupsForTaxonomy]);

  useEffect(() => {
    const valid = new Set(organizerOfferTypeOptions.map((o) => o.key));
    setSelectedTypeKeys((prev) => prev.filter((k) => valid.has(k)));
  }, [organizerOfferTypeOptions]);

  const selectedTypeOptions = useMemo(
    () =>
      organizerOfferTypeOptions.filter(
        (o) => o.key !== ALL_FAMILY_OFFERINGS_KEY && selectedTypeKeys.includes(o.key)
      ),
    [organizerOfferTypeOptions, selectedTypeKeys]
  );

  const typeFilteredServices = useMemo(() => {
    if (selectedTypeKeys.length === 0) return baseOfferings;
    return baseOfferings.filter((s) =>
      selectedTypeOptions.some((o) => matchesOfferTypeWords(o.label, s))
    );
  }, [baseOfferings, selectedTypeKeys, selectedTypeOptions]);

  const searchNeedle = serviceSearch.trim().toLowerCase();

  const searchMatches = useMemo(() => {
    if (!searchNeedle) return [];
    return organizerOfferings
      .filter((s) => serviceOfferKeywordHaystack(s).includes(searchNeedle))
      .slice(0, 96);
  }, [searchNeedle, organizerOfferings]);

  const searchMatchesSelection = useMemo(() => {
    const allowed = new Set(typeFilteredServices.map((s) => s.id));
    return searchMatches.filter((s) => allowed.has(s.id));
  }, [searchMatches, typeFilteredServices]);

  const searchIgnoresSelection =
    Boolean(searchNeedle) &&
    searchMatches.length > 0 &&
    searchMatchesSelection.length === 0 &&
    (selectedFamilyIds.length > 0 || selectedTypeKeys.length > 0);

  const selectedFamiliesLabel = useMemo(() => {
    if (selectedFamilyIds.length === 0) return "All families";
    return selectedFamilyIds
      .map((id) => eventCategoryGroups.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }, [selectedFamilyIds]);

  const gridServices = useMemo(() => {
    if (searchNeedle) return searchMatches;
    return typeFilteredServices;
  }, [searchNeedle, searchMatches, typeFilteredServices]);

  const singleTypeForHero = useMemo(() => {
    if (selectedTypeKeys.length !== 1) return null;
    return organizerOfferTypeOptions.find((o) => o.key === selectedTypeKeys[0]);
  }, [selectedTypeKeys, organizerOfferTypeOptions]);

  const activeHero = useMemo(() => {
    const group = primaryGroup;
    if (singleTypeForHero?.kind === "taxonomy" && singleTypeForHero.leafSlug) {
      for (const g of eventCategoryGroups) {
        const leaf = g.items.find(
          (i) => slugifyCategoryName(i.name) === singleTypeForHero.leafSlug
        );
        if (leaf) {
          return {
            image: leaf.image,
            caption: leaf.description,
            title: leaf.name,
          };
        }
      }
    }
    return {
      image: group.heroImage,
      caption: group.description,
      title: group.name,
    };
  }, [primaryGroup, singleTypeForHero]);

  const breakdownRowsDisplay = useMemo(() => {
    return breakdown.map((row, i) => {
      const sid = row.service_id ?? selectedIds[i];
      const api = sid != null ? rows.find((r) => r.id === sid) : undefined;
      const organizerId = row.organizer_id ?? api?.organizer;
      const organizerCompany =
        row.organizer_company ||
        row.organizer_name ||
        api?.organizer_name ||
        "";
      const profileHref =
        organizerId != null
          ? `/organizers/${organizerId}?returnTo=${encodeURIComponent(
              "/package-builder?resume=1"
            )}`
          : null;
      return { row, sid, organizerId, organizerCompany, profileHref };
    });
  }, [breakdown, selectedIds, rows]);

  const selectedApis = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );

  const localCards: Service[] = useMemo(
    () => selectedApis.map(mapServiceApiToCard),
    [selectedApis]
  );

  const localSubtotal = useMemo(() => {
    return selectedApis.reduce((sum, s) => {
      const unit = unitPriceForTier(s, tier);
      if (unitPerGuest(s)) return sum + unit * Math.max(1, guests);
      return sum + unit;
    }, 0);
  }, [selectedApis, tier, guests]);

  const buildEstimateItems = useCallback(() => {
    const items: {
      service?: number;
      category?: number;
      tier: string;
      quantity: number;
    }[] = [];
    for (const id of selectedIds) {
      const s = rows.find((r) => r.id === id);
      if (s) {
        items.push({
          service: s.id,
          tier,
          quantity: quantityFor(s, guests),
        });
      }
    }
    return items;
  }, [selectedIds, rows, tier, guests]);

  const runEstimate = useCallback(async () => {
    const items = buildEstimateItems();
    if (items.length === 0) {
      setEstimateTotal(null);
      setEstimateMin(null);
      setEstimateMax(null);
      setSuggestions([]);
      setBreakdown([]);
      return;
    }
    try {
      const res = await budgetEstimate({ items }, { auth: false });
      setEstimateTotal(res.total_estimate);
      setEstimateMin(res.min_estimate);
      setEstimateMax(res.max_estimate);
      setSuggestions(res.suggestions ?? []);
      setBreakdown(res.breakdown ?? []);
    } catch {
      setEstimateTotal(null);
      setEstimateMin(null);
      setEstimateMax(null);
      setSuggestions([]);
      setBreakdown([]);
    }
  }, [buildEstimateItems]);

  useEffect(() => {
    const t = setTimeout(() => void runEstimate(), 350);
    return () => clearTimeout(t);
  }, [runEstimate, selectedIds, guests, tier]);

  useEffect(() => {
    if (!isClientUser(user) || !packageId) return;
    void patchPackage(packageId, {
      guest_count: guests,
      venue: eventCity,
      event_date: eventDate || null,
      event_type: resolvedEventType,
      tier,
      notes: packageNotes,
    }).catch(() => {});
  }, [
    user,
    packageId,
    guests,
    eventCity,
    eventDate,
    resolvedEventType,
    tier,
    packageNotes,
  ]);

  const ensurePackage = async (): Promise<number> => {
    if (packageId) return packageId;
    const et = resolvedEventType.trim() || "Event";
    const p = await createPackage({
      name: `${et} package`,
      event_type: et,
      tier,
      guest_count: guests,
      venue: eventCity,
      event_date: eventDate || null,
      notes: packageNotes,
    });
    setPackageId(p.id);
    return p.id;
  };

  const toggle = async (s: ServiceApi) => {
    setNote(null);
    const isSel = selectedIds.includes(s.id);

    if (isSel) {
      setSelectedIds((prev) => prev.filter((x) => x !== s.id));
      if (isClientUser(user)) {
        const iid = itemByService[s.id];
        if (iid) {
          setBusy(true);
          try {
            await deletePackageItem(iid);
            setItemByService((m) => {
              const next = { ...m };
              delete next[s.id];
              return next;
            });
          } catch {
            setSelectedIds((prev) => [...prev, s.id]);
            setNote("Could not remove from your saved package. Try again.");
          } finally {
            setBusy(false);
          }
        } else {
          setItemByService((m) => {
            const next = { ...m };
            delete next[s.id];
            return next;
          });
        }
      }
      return;
    }

    setSelectedIds((prev) => [...prev, s.id]);
    if (isClientUser(user)) {
      setBusy(true);
      try {
        const pid = await ensurePackage();
        const item = await createPackageItem({
          package: pid,
          service: s.id,
          tier,
          quantity: quantityFor(s, guests),
        });
        setItemByService((m) => ({ ...m, [s.id]: item.id }));
      } catch {
        setSelectedIds((prev) => prev.filter((x) => x !== s.id));
        setNote("Could not save to your package. Sign in as a client or try again.");
      } finally {
        setBusy(false);
      }
    }
  };

  const hasPackageContent = selectedIds.length > 0;

  const subtotal = estimateTotal != null ? estimateTotal : localSubtotal;
  const platformFee = Math.round(subtotal * 0.03);
  const total = subtotal + platformFee;
  const platformFeeMin =
    estimateMin != null ? Math.round(estimateMin * 0.03) : null;
  const platformFeeMax =
    estimateMax != null ? Math.round(estimateMax * 0.03) : null;
  const totalRangeLow =
    estimateMin != null && platformFeeMin != null
      ? estimateMin + platformFeeMin
      : null;
  const totalRangeHigh =
    estimateMax != null && platformFeeMax != null
      ? estimateMax + platformFeeMax
      : null;
  const showOverallBudgetSpread =
    totalRangeLow != null &&
    totalRangeHigh != null &&
    totalRangeHigh > totalRangeLow + 0.5;

  const submit = async () => {
    setNote(null);
    if (!ready || authLoading) {
      setNote("Checking your session… try again in a second.");
      return;
    }
    if (!getStoredTokens()?.access) {
      router.push("/login?next=/package-builder");
      return;
    }
    let me = null;
    try {
      me = normalizeUserMe(await fetchMe());
    } catch {
      me = null;
    }
    if (!me) {
      router.push("/login?next=/package-builder");
      return;
    }
    if (!isClientUser(me)) {
      setNote("Only clients can submit a package booking.");
      return;
    }
    if (!eventDate) {
      setNote("Choose an event date.");
      return;
    }
    if (eventPreset === "custom" && !eventTypeOther.trim()) {
      setNote("Enter your event type or pick a preset.");
      return;
    }
    if (selectedIds.length === 0) {
      setNote("Select at least one service.");
      return;
    }
    if (!eventCtxHydrated || !activeEvent) {
      setNote(
        "Name your event in step 1 so booking requests group together on your dashboard."
      );
      return;
    }
    setBusy(true);
    try {
      const pid = await ensurePackage();
      const baseNotes =
        packageNotes.trim() ||
        `City: ${eventCity}. Tier: ${tier}. Guests: ${guests}.`;
      const ref = `\n[Build package #${pid} · multi-vendor]`;
      let succeeded = 0;
      const failedLabels: string[] = [];

      for (const serviceId of selectedIds) {
        const svc = rows.find((r) => r.id === serviceId);
        const idx = selectedIds.indexOf(serviceId);
        const line =
          breakdown.find((b) => b.service_id === serviceId) ??
          (idx >= 0 ? breakdown[idx] : undefined);
        const lineLabel =
          line?.title ??
          (svc ? serviceListingLabel(svc) : `Service #${serviceId}`);
        const organizerLabel = svc?.organizer_name ?? "Organizer";

        const priceLines =
          line && !line.unavailable && line.estimated_price != null
            ? [
                {
                  label: line.title ?? lineLabel,
                  amount: String(line.estimated_price),
                },
              ]
            : undefined;

        try {
          await createBooking({
            service: serviceId,
            client_event: activeEvent.id,
            event_date: eventDate,
            event_time: null,
            guest_count: guests,
            event_type: resolvedEventType.trim() || undefined,
            notes: `${baseNotes}${ref}`,
            total_estimate:
              line && !line.unavailable && line.estimated_price != null
                ? line.estimated_price
                : undefined,
            price_breakdown: priceLines,
          });
          succeeded += 1;
        } catch {
          failedLabels.push(`${organizerLabel} (${lineLabel})`);
        }
      }

      if (succeeded === 0) {
        setNote(
          "Booking requests could not be sent. Check your connection and try again."
        );
        return;
      }
      setNote(
        failedLabels.length === 0
          ? `Submitted ${succeeded} booking request(s) — one per selected service. Track each under My Bookings.`
          : `Submitted ${succeeded} request(s). Some failed: ${failedLabels.join("; ")}.`
      );
      router.push("/dashboard/client/bookings");
    } catch {
      setNote("Something went wrong while submitting. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  function persistPackageBuilderSnapshot() {
    if (typeof window === "undefined") return;
    const payload: PackageBuilderSnapshotV1 = {
      v: 1,
      selectedIds,
      selectedFamilyIds,
      selectedTypeKeys,
      packageId,
      itemByService: Object.fromEntries(
        Object.entries(itemByService).map(([k, v]) => [k, v])
      ) as Record<string, number>,
      tier,
      guests,
      eventDate,
      eventCity,
      serviceSearch,
      packageNotes,
      eventPreset,
      eventTypeOther,
    };
    sessionStorage.setItem(PB_SNAPSHOT_KEY, JSON.stringify(payload));
  }

  function toggleFamily(id: string) {
    setSelectedFamilyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedTypeKeys([]);
  }

  function clearAllFamilies() {
    setSelectedFamilyIds([]);
    setSelectedTypeKeys([]);
  }

  function toggleTypeKey(key: string) {
    if (key === ALL_FAMILY_OFFERINGS_KEY) {
      setSelectedTypeKeys([]);
      return;
    }
    setSelectedTypeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <section className="section">
      <div className="container-x grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="rounded-3xl border border-espresso-200/10 bg-white p-6 shadow-soft">
            <h2 className="font-serif text-2xl text-espresso-200">
              1. Event details
            </h2>
            <p className="mt-1 text-sm text-muted">
              Event type, date, and guest count drive per-guest pricing and your
              budget range.
            </p>
            {isClientUser(user) ? (
              <div className="mt-5 rounded-2xl border border-gold-400/30 bg-gold-50/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso-200/75">
                  Event title (groups your bookings)
                </p>
                {activeEvent ? (
                  <p className="mt-2 text-sm text-espresso-200">
                    Requests attach to{" "}
                    <strong className="font-semibold">{activeEvent.title}</strong>.{" "}
                    <Link
                      href="/dashboard/client"
                      className="text-xs font-medium text-gold-700 underline"
                    >
                      Manage on dashboard
                    </Link>
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 grow">
                      <label className="label text-xs">Title</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Corporate offsite — March"
                        value={pbNewEventTitle}
                        onChange={(e) => setPbNewEventTitle(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={
                        pbCreatingEvent || !pbNewEventTitle.trim()
                      }
                      onClick={() => {
                        void (async () => {
                          if (!pbNewEventTitle.trim()) return;
                          setPbCreatingEvent(true);
                          try {
                            const ev = await createClientEvent({
                              title: pbNewEventTitle.trim(),
                            });
                            setActiveEvent(ev.id, ev.title);
                            setPbNewEventTitle("");
                          } catch {
                            setNote("Could not create event. Try again.");
                          } finally {
                            setPbCreatingEvent(false);
                          }
                        })();
                      }}
                      className="btn-gold shrink-0 px-4 py-2.5 text-sm disabled:opacity-45"
                    >
                      {pbCreatingEvent ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Event type
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EVENT_PRESET_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      setEventPreset(o.key);
                      if (o.key !== "custom") setEventTypeOther("");
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                      eventPreset === o.key
                        ? "bg-espresso-200 text-cream-50"
                        : "border border-espresso-200/15 bg-white text-espresso-200 hover:border-gold-300"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {eventPreset === "custom" && (
                <input
                  type="text"
                  className="input mt-3"
                  placeholder="e.g. Engagement, fundraiser, school gala…"
                  value={eventTypeOther}
                  onChange={(e) => setEventTypeOther(e.target.value)}
                />
              )}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label">Budget tier</label>
                <select
                  className="input"
                  value={tier}
                  onChange={(e) =>
                    setTier(e.target.value as "normal" | "moderate" | "luxury")
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="moderate">Moderate</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">City / Venue</label>
                <input
                  type="text"
                  value={eventCity}
                  onChange={(e) => setEventCity(e.target.value)}
                  className="input"
                  placeholder="Lahore"
                />
              </div>
              <div>
                <label className="label">Guest count</label>
                <input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) =>
                    setGuests(Math.max(1, Number(e.target.value || 0)))
                  }
                  className="input"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Custom notes / special requests</label>
              <textarea
                className="input min-h-[88px] py-3"
                placeholder="Dietary needs, theme, timeline…"
                value={packageNotes}
                onChange={(e) => setPackageNotes(e.target.value)}
              />
            </div>
            {!isClientUser(user) && (
              <p className="mt-4 text-xs text-muted">
                <Link href="/register" className="text-gold-400 hover:underline">
                  Create a client account
                </Link>{" "}
                to save your selections for a booking request.
              </p>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-serif text-2xl text-espresso-200">
              2. Service types (organizer offerings)
            </h2>
            <p className="mt-1 text-sm text-muted">
              We only <strong className="font-medium text-espresso-200">show</strong>{" "}
              live listings. Select one or more{" "}
              <strong className="font-medium text-espresso-200">
                service families
              </strong>{" "}
              (toggle to add/remove; clear all to browse every family). Types
              filter within that scope.{" "}
              <strong className="font-medium text-espresso-200">Search</strong>{" "}
              always lists matching services from the whole marketplace; if your
              family/type picks don&apos;t overlap the search, we still show
              matches and explain below.
            </p>

            <label className="relative mt-4 block">
              <span className="sr-only">Search services</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                className="input pl-10"
                placeholder="Search by name, category, organizer, city…"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </label>
            {searchNeedle ? (
              <div className="mt-2 space-y-2 text-xs text-muted">
                <p>
                  Showing listings matching your search
                  {gridServices.length === 0
                    ? " — none yet."
                    : ` (${gridServices.length} shown).`}
                </p>
                {searchIgnoresSelection ? (
                  <p className="rounded-lg border border-amber-400/50 bg-amber-50/90 px-3 py-2 text-amber-950">
                    <strong className="font-medium">Selection note:</strong> No
                    results match <strong>both</strong> your search and your
                    current filters ({selectedFamiliesLabel}
                    {selectedTypeKeys.length > 0
                      ? ` · ${selectedTypeKeys.length} type tag(s)`
                      : ""}
                    ). The cards below are everything that matches the search;
                    your filters don&apos;t apply until they overlap.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Service family (multi-select)
              </p>
              <button
                type="button"
                onClick={() => clearAllFamilies()}
                className="text-xs font-medium text-gold-600 underline decoration-gold-400/60 underline-offset-2 hover:text-gold-700"
              >
                Clear all families
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {eventCategoryGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleFamily(g.id)}
                  className={`rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition ${
                    selectedFamilyIds.includes(g.id)
                      ? "bg-espresso-200 text-cream-50"
                      : "border border-espresso-200/15 bg-white text-espresso-200 hover:border-gold-300"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
            {selectedFamilyIds.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                No family filter — showing types and listings from the full
                catalog.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Selected: <strong>{selectedFamiliesLabel}</strong>
              </p>
            )}

            <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Organizer service types (multi-select)
            </p>
            <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-espresso-200/10 bg-cream-50/50 p-2">
              {organizerOfferTypeOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleTypeKey(opt.key)}
                  className={`rounded-lg px-3 py-2 text-left text-xs transition sm:text-sm ${
                    opt.key === ALL_FAMILY_OFFERINGS_KEY
                      ? selectedTypeKeys.length === 0
                        ? "bg-gold-300/40 font-medium text-espresso-200 ring-1 ring-gold-400/50"
                        : "bg-white text-muted hover:bg-cream-100"
                      : selectedTypeKeys.includes(opt.key)
                        ? "bg-gold-300/40 font-medium text-espresso-200 ring-1 ring-gold-400/50"
                        : "bg-white text-muted hover:bg-cream-100"
                  }`}
                >
                  {opt.kind === "custom" ? (
                    <span className="flex flex-col gap-0.5">
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-normal uppercase tracking-wider text-muted">
                        Unique listing
                      </span>
                    </span>
                  ) : opt.kind === "organizer_type" ? (
                    <span className="flex flex-col gap-0.5">
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-normal uppercase tracking-wider text-muted">
                        From organizer listings
                      </span>
                    </span>
                  ) : (
                    opt.label
                  )}
                </button>
              ))}
            </div>

            <div className="relative mt-4 overflow-hidden rounded-2xl border border-espresso-200/10">
              <div className="relative aspect-[21/9] max-h-48 w-full sm:aspect-[3/1]">
                <Image
                  src={activeHero.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
                <p className="absolute bottom-3 left-4 right-4 text-sm font-medium text-cream-50 sm:max-w-md">
                  {activeHero.caption}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {!searchNeedle &&
                baseOfferings.length === 0 &&
                organizerOfferings.length > 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-espresso-200/20 bg-cream-50/60 p-6">
                  <p className="text-sm text-muted">
                    No listings match your selected families (
                    <strong>{selectedFamiliesLabel}</strong>) yet. Clear families
                    or add ones that fit, or{" "}
                    <Link href="/organizers" className="text-gold-500 hover:underline">
                      browse organizers
                    </Link>
                    .
                  </p>
                </div>
              )}
              {!searchNeedle &&
                baseOfferings.length > 0 &&
                typeFilteredServices.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-espresso-200/20 bg-cream-50/60 p-6">
                    <p className="text-sm text-muted">
                      No listings match your selected type tags (every word in
                      each tag must appear on the listing). Tap{" "}
                      <strong>All type tags</strong> to widen, or remove tags.
                    </p>
                  </div>
                )}
              {!searchNeedle &&
                organizerOfferings.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-espresso-200/20 bg-cream-50/60 p-6">
                    <p className="text-sm text-muted">
                      No published services to show yet.{" "}
                      <Link href="/organizers" className="text-gold-500 hover:underline">
                        Browse organizers
                      </Link>
                      .
                    </p>
                  </div>
                )}
              {searchNeedle && gridServices.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-espresso-200/20 bg-cream-50/60 p-6">
                  <p className="text-sm text-muted">
                    No listings match &ldquo;{serviceSearch.trim()}&rdquo;. Try
                    other words or{" "}
                    <Link href="/organizers" className="text-gold-500 hover:underline">
                      browse organizers
                    </Link>
                    .
                  </p>
                </div>
              )}
              {gridServices.map((s) => {
                const isSel = selectedIds.includes(s.id);
                const unit = unitPriceForTier(s, tier);
                const pricingWarning =
                  !Number.isFinite(unit) || unit <= 0;
                return (
                  <ServiceTile
                    key={s.id}
                    service={mapServiceApiToCard(s)}
                    organizerName={s.organizer_name}
                    selected={isSel}
                    guests={guests}
                    disabled={busy}
                    pricingWarning={pricingWarning}
                    onToggle={() => void toggle(s)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:z-20 max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto">
          <div className="rounded-3xl border border-espresso-200/10 bg-espresso-200 p-6 text-cream-50 shadow-soft">
            <div className="flex items-center gap-2 text-gold-300">
              <Wallet size={16} />
              <span className="text-xs uppercase tracking-[0.22em]">
                Live budget
              </span>
            </div>
            <p className="mt-3 font-serif text-5xl text-cream-50">
              {formatPKR(total)}
            </p>
            {showOverallBudgetSpread &&
            totalRangeLow != null &&
            totalRangeHigh != null ? (
              <p className="mt-1 text-xs text-cream-100/70">
                Total range (incl. 3% fee):{" "}
                <span className="font-medium text-cream-50">
                  {formatPKR(totalRangeLow)} – {formatPKR(totalRangeHigh)}
                </span>
              </p>
            ) : estimateMin != null && estimateMax != null ? (
              <p className="mt-1 text-xs text-cream-100/60">
                Subtotal range {formatPKR(estimateMin)} – {formatPKR(estimateMax)}{" "}
                (same category, different organizers)
              </p>
            ) : null}
            <p className="mt-1 text-xs text-cream-100/60">
              {resolvedEventType.trim() || "Pick event type"}
              {" · "}
              For {guests} guest{guests > 1 ? "s" : ""}
              {eventCity ? ` • ${eventCity}` : ""}
              {eventDate ? ` • ${eventDate}` : ""}
            </p>

            <button
              type="button"
              disabled={selectedIds.length === 0 || estimateBusy}
              className="btn-ghost mt-4 inline-flex w-full items-center justify-center gap-2 border border-cream-100/25 text-cream-50 hover:bg-cream-100/10 disabled:opacity-50"
              onClick={() => {
                setEstimateBusy(true);
                void runEstimate().finally(() => setEstimateBusy(false));
              }}
            >
              <Calculator size={16} aria-hidden />
              {estimateBusy ? "Calculating…" : "Calculate breakdown"}
            </button>

            {suggestions.length > 0 && (
              <ul className="mt-4 list-inside list-disc text-xs text-cream-100/70">
                {suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}

            {breakdown.length > 0 && (
              <div className="mt-4 rounded-xl border border-cream-100/15 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cream-100/60">
                  Cost breakdown
                </p>
                <ul className="mt-2 space-y-3 text-xs">
                  {breakdownRowsDisplay.map(
                    ({ row, organizerCompany, profileHref }, i) => (
                    <li
                      key={i}
                      className={`flex flex-col gap-2 border-b border-cream-100/10 pb-3 last:border-0 ${
                        row.unavailable
                          ? "rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-2 text-amber-100"
                          : "text-cream-100/85"
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="min-w-0 font-medium leading-snug">
                          {row.title ?? "Item"}
                          <span className="block font-normal text-cream-100/55">
                            Tier {row.tier} · qty {row.quantity ?? 1}
                          </span>
                          {organizerCompany ? (
                            <span className="mt-1 block text-[11px] font-normal text-cream-100/70">
                              <span className="text-cream-100/50">
                                Organizer ·{" "}
                              </span>
                              {organizerCompany}
                            </span>
                          ) : null}
                        </span>
                        <div
                          className={`shrink-0 text-right ${
                            row.unavailable ? "text-amber-200" : "text-gold-300"
                          }`}
                        >
                          {row.unavailable ? (
                            <span>—</span>
                          ) : (
                            <>
                              <span className="block font-serif text-sm text-gold-300">
                                {formatPKR(row.estimated_price ?? 0)}
                              </span>
                              <span className="block text-[10px] font-normal text-cream-100/55">
                                this listing
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          onClick={() => persistPackageBuilderSnapshot()}
                          className="inline-flex w-fit items-center rounded-lg border border-cream-100/25 bg-cream-100/10 px-2.5 py-1.5 text-[11px] font-medium text-cream-50 transition hover:bg-cream-100/20"
                        >
                          Visit organizer profile
                        </Link>
                      ) : null}
                      {!row.unavailable && lineHasSpread(row) ? (
                        <p className="text-[11px] text-cream-100/65">
                          Range in category:{" "}
                          <span className="text-cream-100/90">
                            {formatPKR(row.min_price ?? 0)} –{" "}
                            {formatPKR(row.max_price ?? 0)}
                          </span>
                        </p>
                      ) : null}
                      {row.unavailable ? (
                        <p className="text-[11px] leading-snug text-amber-200/90">
                          {unavailableLineHint(row)}
                        </p>
                      ) : null}
                    </li>
                    )
                  )}
                </ul>
              </div>
            )}

            <div className="mt-6 max-h-80 overflow-y-auto pr-1">
              {localCards.length === 0 ? (
                <p className="rounded-xl border border-cream-100/10 p-4 text-center text-xs text-cream-100/60">
                  No services selected yet. Tap organizer offerings on the left —
                  subtotal, range, and total update automatically.
                </p>
              ) : (
                <ul className="divide-y divide-cream-100/10">
                  {localCards.map((s) => {
                    const api = selectedApis.find((x) => String(x.id) === s.id);
                    const unit =
                      api != null ? unitPriceForTier(api, tier) : s.priceFrom;
                    const lineTotal = cardIsPerGuest(s)
                      ? unit * Math.max(1, guests)
                      : unit;
                    const lineUnavailable =
                      api != null &&
                      (!api.availability ||
                        !Number.isFinite(unit) ||
                        unit <= 0);
                    return (
                      <li
                        key={s.id}
                        className={`flex items-start justify-between gap-3 py-3 ${
                          lineUnavailable ? "rounded-lg bg-amber-500/10 px-2" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-cream-50">
                            {s.name}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-cream-100/50">
                            {lineUnavailable ? (
                              <span className="text-amber-200/90">
                                {!api?.availability
                                  ? "Not offered — excluded from total"
                                  : "No rate for this tier — excluded"}
                              </span>
                            ) : cardIsPerGuest(s) ? (
                              `${formatPKR(unit)} × ${guests}`
                            ) : (
                              "Flat fee"
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`text-sm ${
                              lineUnavailable ? "text-amber-200" : "text-gold-300"
                            }`}
                          >
                            {lineUnavailable ? "—" : formatPKR(lineTotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => api && void toggle(api)}
                            className="text-cream-100/50 hover:text-gold-300"
                            aria-label="Remove"
                            disabled={busy}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <Row
                label="Subtotal (your selections)"
                value={formatPKR(subtotal)}
              />
              {estimateMin != null &&
              estimateMax != null &&
              estimateMax > estimateMin + 0.5 ? (
                <Row
                  label="Subtotal range (market)"
                  value={`${formatPKR(estimateMin)} – ${formatPKR(estimateMax)}`}
                />
              ) : null}
              <Row label="Platform fee (3%)" value={formatPKR(platformFee)} />
              {showOverallBudgetSpread &&
              platformFeeMin != null &&
              platformFeeMax != null ? (
                <Row
                  label="Fee range (on market subtotal)"
                  value={`${formatPKR(platformFeeMin)} – ${formatPKR(platformFeeMax)}`}
                />
              ) : null}
              <div className="my-2 h-px bg-cream-100/10" />
              <Row label="Estimated total" value={formatPKR(total)} bold />
              {showOverallBudgetSpread &&
              totalRangeLow != null &&
              totalRangeHigh != null ? (
                <p className="text-right text-[11px] text-cream-100/60">
                  Range: {formatPKR(totalRangeLow)} –{" "}
                  {formatPKR(totalRangeHigh)}
                </p>
              ) : null}
            </div>

            {note && (
              <p className="mt-4 rounded-lg border border-cream-100/20 px-3 py-2 text-center text-xs text-cream-100/90">
                {note}
              </p>
            )}

            {!user && (
              <p className="mt-4 rounded-xl border border-cream-100/20 bg-cream-100/5 px-3 py-2 text-center text-xs text-cream-100/85">
                Sign in as a client to save this package to your account and submit a
                booking.{" "}
                <Link href="/login?next=/package-builder" className="text-gold-300 underline">
                  Sign in
                </Link>
              </p>
            )}
            <button
              type="button"
              disabled={!hasPackageContent || busy}
              className="btn-gold mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void submit()}
            >
              {isClientUser(user)
                ? "Submit booking request(s)"
                : "Sign in to book"}
            </button>
            {isClientUser(user) ? (
              <p className="mt-2 text-center text-[11px] leading-snug text-cream-100/65">
                One request is sent per selected listing — mix organizers freely.
                Each organizer receives only their line item.
              </p>
            ) : null}
            <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-cream-100/50">
              You won&apos;t be charged yet
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-espresso-200/10 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Pro tip
            </p>
            <p className="mt-2 font-serif text-lg text-espresso-200">
              Lock the venue first, then layer in catering and decor.
            </p>
          </div>
        </aside>
      </div>

      {selectedIds.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-4 pt-2 lg:hidden">
          <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-white/10 bg-espresso-200/95 px-4 py-3 text-cream-50 shadow-2xl backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cream-100/60">
              Selection ({selectedIds.length})
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <ul className="min-w-0 flex-1 space-y-0.5 text-[11px] text-cream-100/80">
                {localCards.slice(0, 3).map((s) => {
                  const line =
                    cardIsPerGuest(s) ? s.priceFrom * guests : s.priceFrom;
                  return (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="truncate">{s.name}</span>
                      <span className="shrink-0 text-gold-300">{formatPKR(line)}</span>
                    </li>
                  );
                })}
                {localCards.length > 3 && (
                  <li className="text-cream-100/50">+{localCards.length - 3} more</li>
                )}
              </ul>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-cream-100/50">
                  Est. total
                </p>
                <p className="font-serif text-xl text-gold-300">{formatPKR(total)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-cream-100/70">{label}</span>
      <span
        className={
          bold ? "font-serif text-xl text-gold-300" : "text-cream-50"
        }
      >
        {value}
      </span>
    </div>
  );
}

function ServiceTile({
  service,
  organizerName,
  selected,
  guests,
  onToggle,
  disabled,
  pricingWarning,
}: {
  service: Service;
  organizerName?: string;
  selected: boolean;
  guests: number;
  onToggle: () => void;
  disabled?: boolean;
  pricingWarning?: boolean;
}) {
  const lineTotal = cardIsPerGuest(service)
    ? service.priceFrom * guests
    : service.priceFrom;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition ${
        selected
          ? "border-gold-400 bg-gold-300/10 shadow-gold ring-2 ring-gold-400/60"
          : pricingWarning
            ? "border-amber-400/50 bg-amber-50/40 shadow-soft hover:-translate-y-1"
            : "border-espresso-200/10 bg-white shadow-soft hover:-translate-y-1 hover:shadow-gold"
      } disabled:opacity-60`}
    >
      {pricingWarning ? (
        <p className="border-b border-amber-400/40 bg-amber-100/90 px-4 py-2 text-left text-[11px] font-medium text-amber-950">
          No rate on file for this budget tier — pick another tier or listing for
          a number in your breakdown.
        </p>
      ) : null}
      <div className="relative aspect-[16/10]">
        <Image
          src={service.image}
          alt={service.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-espresso-200/85 px-3 py-1 text-xs text-cream-50">
          <Star size={12} className="fill-gold-300 text-gold-300" />
          {service.rating}
        </div>
        {selected && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold-300 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-espresso-200">
            <CheckCircle2 size={12} /> Added
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
          <MapPin size={12} className="text-gold-300" />
          {service.city}
        </div>
        <h3 className="mt-1 font-serif text-lg text-espresso-200">
          {service.name}
        </h3>
        {organizerName ? (
          <p className="mt-0.5 text-[11px] text-muted">
            <span className="font-medium uppercase tracking-[0.14em] text-espresso-200/70">
              Organizer
            </span>{" "}
            {organizerName}
          </p>
        ) : null}
        <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">
          {service.description}
        </p>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              {service.unit}
            </p>
            <p className="font-serif text-lg text-espresso-200">
              {formatPKR(service.priceFrom)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-gold-500">
              {cardIsPerGuest(service)
                ? `For ${guests} guests: ${formatPKR(lineTotal)}`
                : `Event total: ${formatPKR(lineTotal)}`}
            </p>
          </div>
          <span
            className={`flex flex-col items-end gap-0.5 text-xs font-medium uppercase tracking-[0.18em] ${
              selected ? "text-espresso-200" : "text-gold-400"
            }`}
          >
            {selected ? (
              <span className="flex items-center gap-1">
                <Trash2 size={12} /> Remove
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Plus size={12} /> Add
              </span>
            )}
            <span className="font-serif text-base normal-case tracking-normal text-espresso-200">
              {formatPKR(lineTotal)}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}
