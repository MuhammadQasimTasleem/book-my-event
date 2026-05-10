"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchOrganizerProfile,
  fetchServices,
  patchOrganizerProfile,
} from "@/lib/api/client";
import type { OrganizerProfileApi, ServiceApi } from "@/lib/api/types";
import { formatPKR } from "@/lib/data";
import { useAuth } from "@/components/providers";

const STATUSES = ["draft", "pending", "approved", "rejected"] as const;

export default function AdminOrganizerEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { adminUser, loading: authLoading } = useAuth();
  const [row, setRow] = useState<OrganizerProfileApi | null>(null);
  const [company_name, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [approval_status, setApprovalStatus] =
    useState<(typeof STATUSES)[number]>("pending");
  const [approval_notes, setApprovalNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceApi[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser || adminUser.role !== "admin") {
      router.replace("/dashboard/admin/login");
      return;
    }
    if (!Number.isFinite(id)) return;
    void fetchOrganizerProfile(id, { auth: "admin" })
      .then((o) => {
        setRow(o);
        setCompanyName(o.company_name);
        setDescription(o.description ?? "");
        setApprovalStatus(
          (STATUSES.includes(o.approval_status as (typeof STATUSES)[number])
            ? o.approval_status
            : "pending") as (typeof STATUSES)[number]
        );
        setApprovalNotes(o.approval_notes ?? "");
      })
      .catch(() => setErr("Could not load organizer."));
  }, [adminUser, authLoading, router, id]);

  useEffect(() => {
    if (!row?.user || !adminUser || adminUser.role !== "admin") {
      setServices([]);
      return;
    }
    void fetchServices(
      { organizer: String(row.user) },
      { auth: "admin", pageSize: 100 }
    )
      .then((d) => setServices(d.results))
      .catch(() => setServices([]));
  }, [row?.user, adminUser]);

  const save = async () => {
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      const o = await patchOrganizerProfile(id, {
        company_name,
        description,
        approval_status,
        approval_notes,
      }, { auth: "admin" });
      setRow(o);
      setMsg("Saved.");
    } catch {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !adminUser || adminUser.role !== "admin") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  if (!row && !err) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/admin/organizers"
        className="text-sm text-gold-400 hover:underline"
      >
        ← All organizers
      </Link>
      <h1 className="font-serif text-3xl text-espresso-200">Edit organizer</h1>
      {err && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}
      <div className="space-y-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
        <p className="text-xs text-muted">
          User ID {row?.user} ·{" "}
          <Link
            href={row ? `/dashboard/admin/users/${row.user}` : "#"}
            className="text-gold-400 hover:underline"
          >
            Linked account
          </Link>
          {" · "}
          <Link
            href={row ? `/organizers/${row.user}` : "#"}
            className="text-gold-400 hover:underline"
          >
            Public page
          </Link>
        </p>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Company name
          <input
            className="input normal-case"
            value={company_name}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Description
          <textarea
            className="input min-h-[120px] normal-case"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Approval status
          <select
            className="input normal-case"
            value={approval_status}
            onChange={(e) =>
              setApprovalStatus(e.target.value as (typeof STATUSES)[number])
            }
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Approval notes (internal)
          <textarea
            className="input min-h-[80px] normal-case"
            value={approval_notes}
            onChange={(e) => setApprovalNotes(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={saving}
          className="btn-primary"
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {row && (
        <div className="space-y-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
          <h2 className="font-serif text-xl text-espresso-200">
            Services by this organizer ({services.length})
          </h2>
          <p className="text-sm text-muted">
            Listings they created. The public site only shows them once this organizer
            is approved; you can edit any row from here.
          </p>
          {services.length === 0 ? (
            <p className="text-sm text-muted">No services yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-espresso-200/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-espresso-200/10 bg-cream-100/40 text-[11px] uppercase tracking-[0.18em] text-muted">
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-espresso-200/10">
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-medium text-espresso-200">
                        {s.title}
                      </td>
                      <td className="px-3 py-2 text-muted">{s.category_name}</td>
                      <td className="px-3 py-2 text-espresso-200">
                        {formatPKR(Number(s.price))}
                        <span className="text-xs text-muted">
                          {" "}
                          / {s.pricing_unit === "per_guest" ? "guest" : "event"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/dashboard/admin/services/${s.id}`}
                          className="text-xs uppercase tracking-[0.14em] text-gold-500 hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
