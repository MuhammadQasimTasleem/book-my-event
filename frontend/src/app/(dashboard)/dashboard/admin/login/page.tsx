"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarHeart, Lock, Mail } from "lucide-react";
import { useAuth } from "@/components/providers";

function errMessage(err: unknown): string {
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
  return "Sign in failed. Check your email and password.";
}

export default function AdminLoginPage() {
  const { adminLogin, adminUser, loading, refreshAdminUser } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (adminUser?.role === "admin") {
      const next = search.get("next") ?? "";
      const dest =
        next.startsWith("/") && next.startsWith("/dashboard/admin") ? next : "/dashboard/admin";
      router.replace(dest);
    }
  }, [loading, adminUser, router, search]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await adminLogin(email.trim(), password);
      const next = search.get("next") ?? "";
      const dest =
        next.startsWith("/") && next.startsWith("/dashboard/admin") ? next : "/dashboard/admin";
      router.push(dest);
      router.refresh();
    } catch (ex: unknown) {
      const detail =
        ex && typeof ex === "object" && "detail" in ex
          ? (ex as { detail: unknown }).detail
          : undefined;
      setError(ex instanceof Error && !detail ? ex.message : errMessage({ detail }));
      void refreshAdminUser();
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  return (
    <section className="relative isolate overflow-hidden bg-cream-50">
      <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-300 text-espresso-200">
              <CalendarHeart size={18} />
            </span>
            <span className="font-serif text-2xl text-espresso-200">Book My Event</span>
          </Link>

          <p className="mt-8 font-script text-2xl text-gold-300">staff console</p>
          <h1 className="mt-1 font-serif text-4xl text-espresso-200">Administrator sign in</h1>
          <p className="mt-3 text-sm text-muted">
            This page is separate from client and organizer sign-in. Use your admin account
            only here.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  className="input pl-10"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  className="input pl-10"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in to admin console"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            <Link href="/login" className="text-gold-400 hover:underline">
              Client / organizer sign in
            </Link>
            {" · "}
            <Link href="/" className="text-gold-400 hover:underline">
              Main site
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
