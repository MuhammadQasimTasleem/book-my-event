"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarHeart, Lock, Mail } from "lucide-react";
import { AuthHeroPanel } from "@/components/auth-hero-panel";
import { ADMIN_USE_CONSOLE_CODE, useAuth } from "@/components/providers";

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
  return "Sign in failed. Check your email and password.";
}

export default function LoginForm() {
  const { login, logout } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountKind, setAccountKind] = useState<"client" | "organizer">("client");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (search.get("verified") !== "pending") return;
    const em = search.get("email");
    if (em) setEmail(em);
  }, [search]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const me = await login(email.trim(), password);
      const next = search.get("next") ?? "";

      if (next.includes("/dashboard/admin")) {
        logout();
        setError(
          "The staff console uses a separate sign-in. Use the administrator link below."
        );
        return;
      }

      if (accountKind === "client" && me.role !== "client") {
        logout();
        setError(
          "This email is registered as an event organizer. Select “Event organizer” above, or use a different account."
        );
        return;
      }
      if (accountKind === "organizer" && me.role !== "organizer") {
        logout();
        setError(
          "This email is a client account. Select “Client / guest” above, or register as an organizer."
        );
        return;
      }

      if (me.role === "organizer") {
        const okNext =
          next &&
          next.startsWith("/") &&
          (next.startsWith("/dashboard") || next.startsWith("/chat/"));
        router.push(okNext ? next : "/dashboard/organizer");
      } else {
        if (next && next.startsWith("/")) {
          router.push(next);
        } else {
          router.push("/");
        }
      }
      router.refresh();
    } catch (ex: unknown) {
      if (
        ex &&
        typeof ex === "object" &&
        "code" in ex &&
        (ex as { code: unknown }).code === ADMIN_USE_CONSOLE_CODE
      ) {
        setError(
          "Administrator accounts must use the staff sign-in page (not client/organizer)."
        );
        return;
      }
      const detail =
        ex && typeof ex === "object" && "detail" in ex
          ? (ex as { detail: unknown }).detail
          : undefined;
      setError(errMessage({ detail }));
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="relative isolate overflow-hidden bg-cream-50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="flex min-h-0 items-center justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14 xl:px-12">
          <div className="w-full max-w-md">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-300 text-espresso-200">
                <CalendarHeart size={18} />
              </span>
              <span className="font-serif text-2xl text-espresso-200">
                Book My Event
              </span>
            </Link>

            <h1 className="mt-10 font-serif text-4xl text-espresso-200">
              Sign in
            </h1>
            <p className="mt-4 text-sm text-muted">
              <Link
                href="/dashboard/admin/login"
                className="font-medium text-gold-500 hover:underline"
              >
                Staff / administrator sign in
              </Link>
            </p>
            {search.get("verified") === "pending" && (
              <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                We sent a message to{" "}
                <span className="font-medium">
                  {search.get("email") || "your email"}
                </span>
                . Open the <strong>Verify your email</strong> link, then sign in
                below. If you don&apos;t see it, check spam or the terminal where
                the API is running (dev mode without real SMTP).
              </p>
            )}
            {search.get("organizer") === "1" && (
              <p className="mt-4 rounded-xl border border-espresso-200/15 bg-cream-50 px-4 py-3 text-sm text-espresso-200">
                <strong className="font-medium">Event organizer:</strong> verifying your email only
                unlocks sign-in. You are{" "}
                <strong className="font-medium">not a verified marketplace organizer</strong> until
                you complete your business profile, publish at least one service, submit for staff
                review, and an administrator approves your profile after reviewing it.
              </p>
            )}
            <p className="mt-2 text-sm text-muted">
              New here?{" "}
              <Link href="/register" className="text-gold-400 hover:underline">
                Create an account
              </Link>
            </p>

            <div className="mt-6 rounded-2xl border border-espresso-200/10 bg-white/80 p-1 shadow-inner">
              <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
                I am signing in as
              </p>
              <div className="mt-1 grid grid-cols-2 gap-1 p-1">
                <button
                  type="button"
                  onClick={() => setAccountKind("client")}
                  className={`rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    accountKind === "client"
                      ? "bg-espresso-200 text-cream-50 shadow-soft"
                      : "text-espresso-200 hover:bg-cream-100/80"
                  }`}
                >
                  Client / guest
                  <span className="mt-0.5 block text-[11px] font-normal text-muted">
                    Book events &amp; packages
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountKind("organizer")}
                  className={`rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    accountKind === "organizer"
                      ? "bg-espresso-200 text-cream-50 shadow-soft"
                      : "text-espresso-200 hover:bg-cream-100/80"
                  }`}
                >
                  Event organizer
                  <span className="mt-0.5 block text-[11px] font-normal text-muted">
                    Manage listings &amp; bookings
                  </span>
                </button>
              </div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              {error && (
                <div className="space-y-2">
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {error}
                  </p>
                  {/verify|not verified/i.test(error) && (
                    <p className="text-xs text-muted">
                      Use the verification link from your registration email first.
                      With console email (dev), copy the link from the server
                      terminal.
                    </p>
                  )}
                </div>
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
                    placeholder="you@example.com"
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <p className="mt-2 text-right text-xs">
                  <Link href="/forgot-password" className="text-gold-400 hover:underline">
                    Forgot password?
                  </Link>
                </p>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-muted">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>

        <AuthHeroPanel
          src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=max&w=1600&q=85"
          alt="Elegant event table and floral decor"
          eyebrow="welcome back"
          title={
            <>
              Your celebration,
              <br />
              perfectly planned.
            </>
          }
          description="Sign in to manage your bookings, build packages, and chat with your organizer."
          gradient="tr"
        />
      </div>
    </section>
  );
}
