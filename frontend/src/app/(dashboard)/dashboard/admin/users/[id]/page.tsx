"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { fetchAdminUser, fetchOrganizers } from "@/lib/api/client";
import type { AdminUserApi, OrganizerProfileApi } from "@/lib/api/types";
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
  return "Could not load user.";
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { adminUser, loading: authLoading } = useAuth();
  const [row, setRow] = useState<AdminUserApi | null>(null);
  const [organizerProfiles, setOrganizerProfiles] = useState<OrganizerProfileApi[]>(
    []
  );
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.replace(
        `/dashboard/admin/login?next=${encodeURIComponent(`/dashboard/admin/users/${id}`)}`
      );
      return;
    }
    if (adminUser.role !== "admin") {
      router.replace("/dashboard/admin/login");
      return;
    }
    if (!Number.isFinite(id)) {
      setErr("Invalid user id.");
      return;
    }
    setErr(null);
    void fetchAdminUser(id)
      .then(async (u) => {
        setRow(u);
        if (u.role === "organizer") {
          const org = await fetchOrganizers({ user: String(id) }, { auth: "admin" });
          setOrganizerProfiles(org.results);
        } else {
          setOrganizerProfiles([]);
        }
      })
      .catch((e: unknown) => {
        setRow(null);
        setOrganizerProfiles([]);
        setErr(apiErrMessage(e));
      });
  }, [adminUser, authLoading, router, id]);

  if (authLoading || !adminUser || adminUser.role !== "admin") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  if (!row && !err) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/admin/users"
        className="text-sm text-gold-400 hover:underline"
      >
        ← All users
      </Link>
      <div className="flex items-start gap-3">
        <UserCircle2 className="mt-1 h-8 w-8 shrink-0 text-gold-400" />
        <div>
          <p className="font-script text-2xl text-gold-300">account</p>
          <h1 className="font-serif text-3xl text-espresso-200">User profile</h1>
          <p className="mt-1 text-sm text-muted">
            Read-only summary. Use the user list to change role, verification, or
            status.
          </p>
        </div>
      </div>

      {err && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </p>
      )}

      {row && (
        <div className="space-y-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Email
              </dt>
              <dd className="mt-0.5 font-medium text-espresso-200">{row.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Username
              </dt>
              <dd className="mt-0.5 text-espresso-200">{row.username}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Name
              </dt>
              <dd className="mt-0.5 text-espresso-200">
                {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Phone
              </dt>
              <dd className="mt-0.5 text-espresso-200">
                {row.phone_number?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Role
              </dt>
              <dd className="mt-0.5 capitalize text-espresso-200">{row.role}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                User ID
              </dt>
              <dd className="mt-0.5 text-espresso-200">#{row.id}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Verified
              </dt>
              <dd className="mt-0.5 text-espresso-200">
                {row.is_verified ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Active
              </dt>
              <dd className="mt-0.5 text-espresso-200">
                {row.is_active ? "Yes" : "Suspended"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Joined
              </dt>
              <dd className="mt-0.5 text-espresso-200">
                {new Date(row.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Updated
              </dt>
              <dd className="mt-0.5 text-espresso-200">
                {new Date(row.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>

          {row.role === "organizer" && (
            <div className="border-t border-espresso-200/10 pt-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Organizer directory profile
              </p>
              {organizerProfiles.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No profile yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {organizerProfiles.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/dashboard/admin/organizers/${p.id}`}
                        className="text-sm font-medium text-gold-500 hover:underline"
                      >
                        Edit organizer profile: {p.company_name}
                      </Link>
                      <span className="ml-2 text-xs text-muted">
                        ({p.approval_status})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
