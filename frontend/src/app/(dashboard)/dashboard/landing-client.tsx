"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Briefcase, User } from "lucide-react";
import { useAuth } from "@/components/providers";

export default function DashboardLandingClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "organizer") router.replace("/dashboard/organizer");
    else if (user.role === "client") router.replace("/dashboard/client");
  }, [user, loading, router]);

  const tiles = [
    {
      href: "/dashboard/client",
      title: "Client Dashboard",
      text: "View bookings, packages, messages and reviews.",
      icon: User,
    },
    {
      href: "/dashboard/organizer",
      title: "Organizer Dashboard",
      text: "Manage services, requests and earnings.",
      icon: Briefcase,
    },
  ];

  if (loading || user) {
    return (
      <div className="py-20 text-center text-sm text-muted">
        {loading ? "Loading…" : "Redirecting to your workspace…"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-espresso-200">
          Choose your workspace
        </h1>
        <p className="mt-1 text-sm text-muted">
          <Link href="/login" className="text-gold-400 hover:underline">
            Sign in
          </Link>{" "}
          to go straight to the right dashboard, or pick a workspace below. Administrators
          use the{" "}
          <Link href="/dashboard/admin/login" className="text-gold-400 hover:underline">
            staff sign-in
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-gold"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-cream-100 text-gold-400 transition group-hover:bg-gold-300 group-hover:text-espresso-200">
              <t.icon size={20} />
            </span>
            <h3 className="mt-5 font-serif text-xl text-espresso-200">
              {t.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{t.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
