"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Check,
  ExternalLink,
  Eye,
  Package,
  ShieldAlert,
  ShieldCheck,
  Star,
  TrendingUp,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { API_ORIGIN } from "@/lib/config";
import StatCard from "@/components/stat-card";
import {
  adminDashboard,
  approveOrganizer,
  fetchPendingOrganizers,
  fetchReviewsAdmin,
  patchReview,
  rejectOrganizer,
} from "@/lib/api/client";
import type { OrganizerProfileApi, ReviewApi } from "@/lib/api/types";
import { useAuth } from "@/components/providers";

function apiErrMessage(err: unknown): string {
  if (err && typeof err === "object" && "detail" in err) {
    const d = (err as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map(String).join(" ");
    if (d && typeof d === "object") {
      const o = d as Record<string, string[]>;
      return Object.values(o)
        .flat()
        .join(" ");
    }
  }
  if (err instanceof Error) return err.message;
  return "Could not load dashboard data.";
}

export default function AdminDashboard() {
  const { adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<Awaited<
    ReturnType<typeof adminDashboard>
  > | null>(null);
  const [pending, setPending] = useState<OrganizerProfileApi[]>([]);
  const [reviews, setReviews] = useState<ReviewApi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    const [d, p, r] = await Promise.all([
      adminDashboard(),
      fetchPendingOrganizers(),
      fetchReviewsAdmin(),
    ]);
    setDash(d);
    setPending(p);
    setReviews(r.results.filter((x) => x.is_visible).slice(0, 12));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.replace("/dashboard/admin/login?next=/dashboard/admin");
      return;
    }
    if (adminUser.role !== "admin") {
      router.replace("/dashboard/admin/login");
      return;
    }
    void load().catch((e: unknown) => setLoadError(apiErrMessage(e)));
  }, [adminUser, authLoading, router]);

  if (authLoading || !adminUser || adminUser.role !== "admin") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  const djangoAdminUrl = `${API_ORIGIN.replace(/\/$/, "")}/admin/`;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-script text-2xl text-gold-300">admin console</p>
        <h1 className="font-serif text-3xl text-espresso-200">System overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Use this dashboard for day-to-day moderation. For full database access
          (create/delete any row, raw model forms), open{" "}
          <strong className="text-espresso-200">Django Admin</strong> on the API
          server (requires a Django superuser).
        </p>
      </div>

      {loadError && (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>
            <span className="font-medium">Could not refresh overview.</span>{" "}
            {loadError}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-rose-900 hover:bg-rose-100"
            onClick={() => void load().catch((e: unknown) => setLoadError(apiErrMessage(e)))}
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gold-300/35 bg-gradient-to-br from-cream-50 to-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Full database UI
            </p>
            <p className="mt-1 font-serif text-xl text-espresso-200">Django Admin</p>
            <p className="mt-1 text-sm text-muted">
              Users, groups, categories, bookings, payments — same origin as your API (
              {djangoAdminUrl}).
            </p>
          </div>
          <a
            href={djangoAdminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-espresso-200 px-5 py-3 text-sm font-medium text-cream-50 transition hover:bg-espresso-300"
          >
            Open Django Admin <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/admin/users"
          className="rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft transition hover:border-gold-300"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Directory</p>
          <p className="mt-2 font-serif text-xl text-espresso-200">Manage users</p>
          <p className="mt-1 text-sm text-muted">List, filter, and suspend accounts.</p>
        </Link>
        <Link
          href="/dashboard/admin/organizers"
          className="rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft transition hover:border-gold-300"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Profiles</p>
          <p className="mt-2 font-serif text-xl text-espresso-200">All organizers</p>
          <p className="mt-1 text-sm text-muted">
            Edit company details and approval status for the public directory.
          </p>
        </Link>
        <Link
          href="/dashboard/admin/services"
          className="rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft transition hover:border-gold-300"
        >
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
            <Briefcase size={14} className="text-gold-400" /> Listings
          </p>
          <p className="mt-2 font-serif text-xl text-espresso-200">All services</p>
          <p className="mt-1 text-sm text-muted">
            Correct categories, pricing, and visibility for marketplace listings.
          </p>
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total users"
          value={String(dash?.total_users ?? "—")}
          hint="Registered accounts"
        />
        <StatCard
          icon={UserCircle2}
          label="Clients"
          value={String(dash?.total_clients ?? "—")}
          hint="Guest accounts"
        />
        <StatCard
          icon={ShieldCheck}
          label="Organizers"
          value={String(dash?.total_organizers ?? "—")}
          hint={`${dash?.pending_approvals ?? 0} pending approval`}
        />
        <StatCard
          icon={CalendarDays}
          label="Bookings"
          value={String(dash?.total_bookings ?? "—")}
          hint={`${dash?.pending_bookings ?? 0} pending`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Services listed"
          value={String(dash?.total_services ?? "—")}
          hint="Across all organizers"
        />
        <StatCard
          icon={Briefcase}
          label="Categories"
          value={String(dash?.total_categories ?? "—")}
          hint="Active taxonomy"
        />
        <StatCard
          icon={Star}
          label="Reviews"
          value={String(dash?.total_reviews ?? "—")}
          hint="All ratings"
        />
        <StatCard
          icon={TrendingUp}
          label="New signups (7d)"
          value={String(dash?.signups_last_7_days ?? "—")}
          hint="Recent registrations"
          tone="ink"
        />
      </div>

      <div className="rounded-2xl border border-espresso-200/10 bg-white p-5 shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Top categories</p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm text-espresso-200">
          {(dash?.top_categories ?? []).length === 0 ? (
            <li className="text-muted">No booking volume yet.</li>
          ) : (
            (dash?.top_categories ?? []).map((c) => (
              <li
                key={c.name}
                className="rounded-full border border-espresso-200/15 bg-cream-50 px-3 py-1"
              >
                {c.name}{" "}
                <span className="text-muted">({c.bookings} bookings)</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <section className="rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-gold-400" />
            <h2 className="font-serif text-2xl text-espresso-200">
              Organizers awaiting verification
            </h2>
          </div>
        </div>
        <div className="grid gap-4 p-6 pt-0 sm:grid-cols-2">
          {pending.length === 0 ? (
            <p className="col-span-full py-6 text-center text-sm text-muted">
              No pending profiles.
            </p>
          ) : (
            pending.map((p) => (
              <article
                key={p.id}
                className="flex flex-col rounded-2xl border border-espresso-200/12 bg-gradient-to-b from-cream-50/50 to-white p-5 shadow-sm"
              >
                <p className="font-serif text-lg text-espresso-200">{p.company_name}</p>
                <p className="mt-1 text-xs text-muted">
                  Account user #{p.user} · status {p.approval_status}
                </p>
                {p.description?.trim() ? (
                  <p className="mt-3 line-clamp-3 text-sm text-espresso-200/85">
                    {p.description.trim()}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-muted">No description yet.</p>
                )}
                <p className="mt-2 text-xs text-muted">
                  {(p.services_count ?? 0) === 0
                    ? "No services listed — review profile before approving."
                    : `${p.services_count} service(s) listed.`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/admin/organizers/${p.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-espresso-200/20 bg-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-espresso-200 hover:border-gold-300 sm:flex-none"
                  >
                    <Eye size={14} /> Review profile
                  </Link>
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-emerald-700 hover:bg-emerald-100 sm:flex-none"
                    onClick={() =>
                      void approveOrganizer(p.id)
                        .then(load)
                        .catch((e: unknown) => setLoadError(apiErrMessage(e)))
                    }
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-rose-50 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-100 sm:flex-none"
                    onClick={() =>
                      void rejectOrganizer(p.id, "Please update credentials")
                        .then(load)
                        .catch((e: unknown) => setLoadError(apiErrMessage(e)))
                    }
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-500" />
            <h2 className="font-serif text-2xl text-espresso-200">
              Recent visible reviews
            </h2>
          </div>
          <Link href="/dashboard/admin" className="text-xs text-muted">
            Moderate below
          </Link>
        </div>
        <div className="divide-y divide-espresso-200/10">
          {reviews.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted">No reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    #{r.id} • reviewer {r.reviewer} → organizer {r.reviewee}
                  </p>
                  <button
                    type="button"
                    className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-rose-700 hover:bg-rose-100"
                    onClick={() =>
                      void patchReview(r.id, { is_visible: false }, { auth: "admin" })
                        .then(load)
                        .catch((e: unknown) => setLoadError(apiErrMessage(e)))
                    }
                  >
                    Hide
                  </button>
                </div>
                <p className="mt-2 flex items-start gap-2 text-sm text-espresso-200">
                  <Star size={14} className="mt-1 shrink-0 fill-gold-300 text-gold-300" />
                  {r.rating}/5 — {r.comment || "(no comment)"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
