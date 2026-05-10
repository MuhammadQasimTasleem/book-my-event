"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyEmailRequest } from "@/lib/api/client";

export default function VerifyEmailInner() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErr("Missing verification token.");
      return;
    }
    let cancelled = false;
    void verifyEmailRequest(token)
      .then((r) => {
        if (!cancelled) setMsg(r.message);
      })
      .catch(() => {
        if (!cancelled) setErr("Invalid or expired token.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="section">
      <div className="container-x flex min-h-[50vh] items-center justify-center py-16">
        <div className="max-w-md rounded-3xl border border-espresso-200/10 bg-white p-8 text-center shadow-soft">
          <h1 className="font-serif text-3xl text-espresso-200">Email verification</h1>
          {!msg && !err && (
            <p className="mt-4 text-sm text-muted">Confirming your address…</p>
          )}
          {msg && <p className="mt-4 text-sm text-emerald-800">{msg}</p>}
          {err && <p className="mt-4 text-sm text-rose-800">{err}</p>}
          <Link href="/login" className="btn-primary mt-8 inline-flex">
            Continue to sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
