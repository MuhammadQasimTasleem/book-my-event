"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Briefcase } from "lucide-react";
import { fetchServices } from "@/lib/api/client";
import type { ServiceApi } from "@/lib/api/types";
import { formatPKR } from "@/lib/data";
import { useAuth } from "@/components/providers";

export default function AdminServicesListPage() {
  const { adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ServiceApi[]>([]);

  const load = useCallback(async () => {
    const d = await fetchServices({}, { auth: "admin", pageSize: 500 });
    setRows(d.results);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.replace("/dashboard/admin/login?next=/dashboard/admin/services");
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
            <Briefcase size={18} /> marketplace
          </p>
          <h1 className="font-serif text-3xl text-espresso-200">All services</h1>
          <p className="mt-1 text-sm text-muted">
            Edit any listing. Only services from approved organizers appear on the
            public site and package builder.
          </p>
        </div>
        <Link href="/dashboard/admin" className="text-sm text-gold-400 hover:underline">
          ← Overview
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-espresso-200/10 bg-white shadow-soft">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-espresso-200/10 bg-cream-100/40 text-[11px] uppercase tracking-[0.18em] text-muted">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Organizer</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-espresso-200/10">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-espresso-200">{s.title}</td>
                <td className="px-4 py-3 text-muted">{s.category_name}</td>
                <td className="px-4 py-3 text-muted">{s.organizer_name}</td>
                <td className="px-4 py-3">{formatPKR(Number(s.price))}</td>
                <td className="px-4 py-3">{s.availability ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/admin/services/${s.id}`}
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-gold-400 hover:underline"
                  >
                    <Pencil size={12} /> Edit
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
