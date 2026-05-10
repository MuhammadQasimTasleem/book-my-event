"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Briefcase,
  CalendarDays,
  CalendarHeart,
  Home,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/components/providers";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: Home },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/organizers", label: "Organizers", icon: ShieldCheck },
  { href: "/dashboard/admin/services", label: "All Services", icon: Briefcase },
  { href: "/dashboard/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/dashboard/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/admin/reviews", label: "Reviews", icon: Star },
];

export default function AdminDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { adminUser, loading, adminLogout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!adminUser || adminUser.role !== "admin") {
      const returnTo = pathname.startsWith("/dashboard") ? pathname : "/dashboard/admin";
      router.replace(
        `/dashboard/admin/login?next=${encodeURIComponent(returnTo)}`
      );
    }
  }, [loading, adminUser, router, pathname]);

  if (loading || !adminUser || adminUser.role !== "admin") {
    return (
      <div className="bg-cream-100/40 py-20 text-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="bg-cream-100/40">
      <div className="container-x grid gap-6 py-8 lg:grid-cols-[280px_1fr] lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-espresso-200/10 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif text-lg text-espresso-200">Admin console</span>
              <button
                type="button"
                onClick={() => {
                  adminLogout();
                  router.replace("/dashboard/admin/login");
                  router.refresh();
                }}
                className="grid h-8 w-8 place-items-center rounded-full border border-espresso-200/15 text-espresso-200 hover:bg-cream-100"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">{adminUser.email}</p>

            <nav className="mt-6">
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
                Moderation
              </p>
              <ul className="space-y-0.5">
                {ADMIN_NAV.map((it) => (
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

            <Link
              href="/"
              className="mt-6 flex items-center gap-2 border-t border-espresso-200/10 pt-4 text-xs text-gold-500 hover:underline"
            >
              <CalendarHeart size={14} />
              Main website
            </Link>
          </div>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
