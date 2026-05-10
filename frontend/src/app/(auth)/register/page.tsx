"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  CalendarHeart,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import clsx from "clsx";
import { AuthHeroPanel } from "@/components/auth-hero-panel";
import {
  createOrganizerProfile,
  loginRequest,
  registerRequest,
} from "@/lib/api/client";
import { useAuth } from "@/components/providers";

type Role = "client" | "organizer";

function uniqueUsername(email: string) {
  const base =
    email
      .split("@")[0]
      .replace(/[^A-Za-z0-9_]/g, "_")
      .slice(0, 24) || "user";
  return `${base}_${Math.random().toString(36).slice(2, 8)}`;
}

function errMessage(err: unknown): string {
  if (err && typeof err === "object" && "detail" in err) {
    const d = (err as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map(String).join(" ");
    if (d && typeof d === "object") {
      const o = d as Record<string, string[] | string>;
      return Object.entries(o)
        .flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${v}`]
        )
        .join(" ");
    }
  }
  return "Registration failed. Check your details and try again.";
}

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [role, setRole] = useState<Role>("client");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!name) {
      setError("Please enter your name.");
      setPending(false);
      return;
    }
    if (role === "organizer" && !businessName.trim()) {
      setError("Please enter your business name.");
      setPending(false);
      return;
    }
    try {
      const reg = await registerRequest({
        name,
        username: uniqueUsername(email.trim()),
        email: email.trim(),
        password,
        role,
      });
      // Default to verification required if the flag is missing (older APIs).
      const needsEmailVerification = reg.requires_verification !== false;
      if (needsEmailVerification) {
        const org = role === "organizer" ? "&organizer=1" : "";
        router.push(
          `/login?verified=pending&email=${encodeURIComponent(email.trim())}${org}`
        );
        router.refresh();
        return;
      }
      await loginRequest(email.trim(), password);
      if (role === "organizer") {
        await createOrganizerProfile({
          company_name: businessName.trim(),
          description: "",
        });
      }
      await refreshUser();
      if (role === "organizer") {
        router.push("/dashboard/organizer?welcome=organizer");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (ex: unknown) {
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
              Create account
            </h1>
            <p className="mt-2 text-sm text-muted">
              Already a member?{" "}
              <Link href="/login" className="text-gold-400 hover:underline">
                Sign in
              </Link>
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {(
                [
                  {
                    id: "client",
                    title: "I'm a client",
                    text: "Plan & book my event",
                    icon: User,
                  },
                  {
                    id: "organizer",
                    title: "I'm an organizer",
                    text: "Offer my services",
                    icon: Briefcase,
                  },
                ] as {
                  id: Role;
                  title: string;
                  text: string;
                  icon: React.ComponentType<{ size?: number; className?: string }>;
                }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={clsx(
                    "rounded-2xl border p-4 text-left transition",
                    role === opt.id
                      ? "border-gold-300 bg-gold-300/10 shadow-gold"
                      : "border-espresso-200/15 bg-white hover:border-gold-300/60"
                  )}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-cream-100 text-gold-400">
                    <opt.icon size={16} />
                  </span>
                  <p className="mt-3 font-serif text-lg text-espresso-200">
                    {opt.title}
                  </p>
                  <p className="text-xs text-muted">{opt.text}</p>
                </button>
              ))}
            </div>

            {role === "organizer" && (
              <p className="mt-6 rounded-xl border border-gold-300/35 bg-gold-300/10 px-4 py-3 text-sm text-espresso-200">
                <strong className="font-medium">Organizers:</strong> after you sign up you must
                verify your email. You are{" "}
                <strong className="font-medium">not a verified marketplace organizer</strong> until
                you complete your business profile, publish services, and an administrator approves
                your profile after reviewing it.
              </p>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First name</label>
                  <input
                    className="input"
                    placeholder="First"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input
                    className="input"
                    placeholder="Last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              {role === "organizer" && (
                <div>
                  <label className="label">Business name</label>
                  <input
                    className="input"
                    placeholder="Your studio"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required={role === "organizer"}
                  />
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
                    autoComplete="new-password"
                    placeholder="Upper, lower, number, symbol (8+)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <p className="flex items-start gap-2 text-xs text-muted">
                <ShieldCheck
                  size={14}
                  className="mt-0.5 shrink-0 text-gold-400"
                />
                Password must include uppercase, lowercase, number, and special
                character.
              </p>

              <button type="submit" className="btn-primary w-full" disabled={pending}>
                {pending ? "Creating…" : "Create account"}
              </button>
            </form>
          </div>
        </div>

        <AuthHeroPanel
          src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=max&w=1600&q=85"
          alt="Wedding reception venue with warm lighting"
          eyebrow="join the family"
          title={
            <>
              Beautifully curated.
              <br />
              Effortlessly hosted.
            </>
          }
          gradient="tl"
        />
      </div>
    </section>
  );
}
