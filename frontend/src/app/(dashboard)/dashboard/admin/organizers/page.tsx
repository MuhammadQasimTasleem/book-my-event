"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Pencil, ShieldCheck } from "lucide-react";
import { fetchOrganizers } from "@/lib/api/client";
import type { OrganizerProfileApi } from "@/lib/api/types";
import { useAuth } from "@/components/providers";

export default function AdminOrganizersListPage() {
  const { adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<OrganizerProfileApi[]>([]);

  const load = useCallback(async () => {
    const d = await fetchOrganizers(undefined, { auth: "admin" });
    setRows(d.results);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.replace("/dashboard/admin/login?next=/dashboard/admin/organizers");
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-script text-2xl text-gold-300">
            <ShieldCheck size={18} /> directory
          </p>
          <h1 className="font-serif text-3xl text-espresso-200">All organizers</h1>
          <p className="mt-1 text-sm text-muted">
            Edit public profiles and approval status. Only approved organizers appear
            on the marketing site.
          </p>
        </div>
        <Link href="/dashboard/admin" className="text-sm text-gold-400 hover:underline">
          ← Overview
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-espresso-200/10 bg-cream-100/40 text-[11px] uppercase tracking-[0.18em] text-muted">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Services</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-espresso-200/10">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-medium text-espresso-200">
                  {o.company_name}
                </td>
                <td className="px-4 py-3 text-muted">#{o.user}</td>
                <td className="px-4 py-3 text-espresso-200">{o.services_count ?? 0}</td>
                <td className="px-4 py-3 capitalize">{o.approval_status}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/admin/organizers/${o.id}`}
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-gold-400 hover:underline"
                  >
                    <Pencil size={12} /> Edit
                  </Link>
                  <Link
                    href={`/organizers/${o.user}`}
                    className="ml-4 text-xs text-muted hover:text-gold-400"
                  >
                    View site
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
