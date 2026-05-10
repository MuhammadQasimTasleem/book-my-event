"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";
import { requestPasswordReset } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setPending(true);
    try {
      const r = await requestPasswordReset(email.trim());
      setMsg(r.message);
    } catch {
      setErr("Could not send reset email. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="section">
      <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-espresso-200/10 bg-white p-8 shadow-soft">
          <h1 className="font-serif text-3xl text-espresso-200">Forgot password</h1>
          <p className="mt-2 text-sm text-muted">
            We&apos;ll email a reset link if an account exists for this address.
          </p>
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
              <label className="label">Email</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  className="input pl-10"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/login" className="text-gold-400 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
