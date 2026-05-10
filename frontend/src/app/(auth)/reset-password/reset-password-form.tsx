"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { confirmPasswordReset } from "@/lib/api/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!token) {
      setErr("Missing token. Open the link from your email.");
      return;
    }
    setPending(true);
    try {
      const r = await confirmPasswordReset(token, password);
      setMsg(r.message);
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setErr("Invalid or expired link. Request a new reset.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="section">
      <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-espresso-200/10 bg-white p-8 shadow-soft">
          <h1 className="font-serif text-3xl text-espresso-200">Set new password</h1>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {msg && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {msg}
              </p>
            )}
            {err && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {err}
              </p>
            )}
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  className="input pl-10"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Updating…" : "Update password"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/login" className="text-gold-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
