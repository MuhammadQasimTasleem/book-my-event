"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Trash2, Users } from "lucide-react";
import {
  deleteAdminUser,
  fetchAdminUsers,
  patchAdminUser,
} from "@/lib/api/client";
import type { AdminUserApi } from "@/lib/api/types";
import { API_ORIGIN } from "@/lib/config";
import { useAuth } from "@/components/providers";

export default function AdminUsersPage() {
  const { adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AdminUserApi[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const djangoAdminUrl = `${API_ORIGIN.replace(/\/$/, "")}/admin/`;

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (roleFilter) params.role = roleFilter;
    if (activeFilter === "true" || activeFilter === "false") {
      params.is_active = activeFilter;
    }
    const d = await fetchAdminUsers(params);
    setRows(d.results);
  }, [roleFilter, activeFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.replace("/dashboard/admin/login?next=/dashboard/admin/users");
      return;
    }
    if (adminUser.role !== "admin") {
      router.replace("/dashboard/admin/login");
      return;
    }
    void load().catch(() => {});
  }, [adminUser, authLoading, router, load]);

  if (authLoading || !adminUser || adminUser.role !== "admin") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-script text-2xl text-gold-300">
            <Users size={18} /> accounts
          </p>
          <h1 className="font-serif text-3xl text-espresso-200">User management</h1>
          <p className="mt-1 text-sm text-muted">
            Suspend, verify, change role, or remove accounts. You cannot deactivate or
            delete yourself here.
          </p>
        </div>
        <Link href="/dashboard/admin" className="text-sm text-gold-400 hover:underline">
          ← Admin overview
        </Link>
      </div>

      <div className="rounded-2xl border border-espresso-200/10 bg-cream-50/80 p-4 text-sm text-muted">
        <p>
          For bulk edits, password resets on behalf of users, or deleting related DB
          rows in one place, use{" "}
          <a
            href={djangoAdminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gold-500 hover:underline"
          >
            Django Admin <ExternalLink className="inline" size={12} />
          </a>{" "}
          (opens the API origin in a new tab).
        </p>
      </div>

      {err && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="text-xs uppercase tracking-[0.18em] text-muted">
          Role
          <select
            className="input mt-1 min-w-[140px]"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="client">Client</option>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-muted">
          Status
          <select
            className="input mt-1 min-w-[140px]"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>
        </label>
        <button type="button" className="btn-ghost self-end" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-espresso-200/10 bg-cream-100/40 text-[11px] uppercase tracking-[0.18em] text-muted">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">View</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-espresso-200/10">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-espresso-200">{r.email}</p>
                  <p className="text-xs text-muted">
                    {r.first_name} {r.last_name} · #{r.id}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="input py-1.5 text-xs capitalize"
                    value={r.role}
                    disabled={r.id === adminUser.id}
                    onChange={(e) => {
                      setErr(null);
                      const role = e.target.value as AdminUserApi["role"];
                      void patchAdminUser(r.id, { role }).then(load).catch(() => {
                        setErr("Could not update role.");
                        void load();
                      });
                    }}
                  >
                    <option value="client">client</option>
                    <option value="organizer">organizer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={r.id === adminUser.id}
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40 ${
                      r.is_verified
                        ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                    }`}
                    onClick={() => {
                      setErr(null);
                      void patchAdminUser(r.id, { is_verified: !r.is_verified })
                        .then(load)
                        .catch(() => setErr("Could not update verification."));
                    }}
                  >
                    {r.is_verified ? "Verified" : "Verify"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={r.id === adminUser.id}
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40 ${
                      r.is_active
                        ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                    }`}
                    onClick={() => {
                      setErr(null);
                      void patchAdminUser(r.id, { is_active: !r.is_active })
                        .then(load)
                        .catch(() => setErr("Could not update active status."));
                    }}
                  >
                    {r.is_active ? "Suspend" : "Restore"}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/users/${r.id}`}
                    className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold-500 hover:underline"
                  >
                    Profile
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={r.id === adminUser.id}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Permanently delete ${r.email}? This cannot be undone.`
                        )
                      )
                        return;
                      setErr(null);
                      void deleteAdminUser(r.id)
                        .then(load)
                        .catch(() => setErr("Delete failed (user may have related data)."));
                    }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
