"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CalendarDays,
  CalendarHeart,
  ClipboardList,
  Home,
  LayoutGrid,
  MessageCircle,
  Settings,
  Star,
  User,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AdminDashboardShell from "./admin-dashboard-shell";
import { useAuth } from "@/components/providers";

type NavItem = { href: string; label: string; icon: LucideIcon };

const SITE_NAV: Record<"client" | "organizer", { title: string; items: NavItem[] }> = {
  client: {
    title: "Client",
    items: [
      { href: "/dashboard/client", label: "Overview", icon: Home },
      { href: "/dashboard/client/bookings", label: "My Bookings", icon: CalendarDays },
      { href: "/dashboard/client/packages", label: "My Packages", icon: ClipboardList },
      { href: "/dashboard/client/messages", label: "Messages", icon: MessageCircle },
      { href: "/dashboard/client/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/client/profile", label: "Profile", icon: User },
    ],
  },
  organizer: {
    title: "Organizer",
    items: [
      { href: "/dashboard/organizer", label: "Overview", icon: Home },
      { href: "/dashboard/organizer/services", label: "My Services", icon: LayoutGrid },
      { href: "/dashboard/organizer/bookings", label: "Booking Requests", icon: CalendarDays },
      { href: "/dashboard/organizer/messages", label: "Messages", icon: MessageCircle },
      { href: "/dashboard/organizer/earnings", label: "Earnings", icon: Wallet },
      { href: "/dashboard/organizer/profile", label: "Profile", icon: Settings },
    ],
  },
};

const ADMIN_LOGIN = "/dashboard/admin/login";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (pathname === ADMIN_LOGIN) return;
    if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) return;
    if (loading) return;
    if (!user) {
      const returnTo = pathname.startsWith("/dashboard") ? pathname : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (user.role !== "client" && user.role !== "organizer") {
      router.replace(`/dashboard/admin/login?next=${encodeURIComponent("/dashboard/admin")}`);
    }
  }, [loading, user, router, pathname]);

  if (pathname === ADMIN_LOGIN) {
    return <>{children}</>;
  }

  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) {
    return <AdminDashboardShell>{children}</AdminDashboardShell>;
  }

  if (loading || !user) {
    return (
      <div className="bg-cream-100/40 py-20 text-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (user.role !== "client" && user.role !== "organizer") {
    return (
      <div className="bg-cream-100/40 py-20 text-center text-sm text-muted">
        Redirecting…
      </div>
    );
  }

  const section = SITE_NAV[user.role];

  return (
    <div className="bg-cream-100/40">
      <div className="container-x grid gap-6 py-8 lg:grid-cols-[280px_1fr] lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-espresso-200/10 bg-white p-5 shadow-soft">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-300 text-espresso-200">
                <CalendarHeart size={16} />
              </span>
              <span className="font-serif text-lg text-espresso-200">
                Book My Event
              </span>
            </Link>

            <nav className="mt-6">
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-espresso-100 transition hover:bg-cream-100 hover:text-espresso-200"
                    >
                      <it.icon size={15} className="text-gold-400" />
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
