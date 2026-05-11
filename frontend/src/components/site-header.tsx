"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  Phone,
  CalendarHeart,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Bell,
  MessageCircle,
  User,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/providers";
import { fetchNotifications, markNotificationRead } from "@/lib/api/client";
import type { NotificationApi } from "@/lib/api/types";

const mainNav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/organizers", label: "Organizers" },
  { href: "/contact", label: "Contact" },
] as const;

const planEventNav = { href: "/package-builder", label: "Plan an event" } as const;

const headerDotPatternStyle: CSSProperties = {
  backgroundImage:
    "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
  backgroundSize: "26px 26px",
};

function dashboardPath(role: string) {
  if (role === "organizer") return "/dashboard/organizer";
  return "/dashboard/client";
}

/** No generic “Dashboard” — organizers and clients each get their own home link copy. */
function dashboardNavLabel(role: string) {
  if (role === "organizer") return "Organizer dashboard";
  return "My dashboard";
}

function navItemClass(pathname: string, href: string) {
  const active =
    href === "/"
      ? pathname === "/"
      : href === planEventNav.href
        ? pathname === planEventNav.href ||
          pathname.startsWith(`${planEventNav.href}/`)
        : pathname === href || pathname.startsWith(`${href}/`);
  return clsx(
    "relative py-1 text-sm font-medium uppercase tracking-[0.16em] transition",
    active
      ? "text-gold-300 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-gold-300 after:content-['']"
      : "text-cream-100/85 hover:text-gold-300"
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationApi[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    if (!user || !open) return;
    if (user.role !== "client" && user.role !== "organizer") return;
    void fetchNotifications().then((d) => setItems(d.results));
  }, [user, open]);

  if (!user || (user.role !== "client" && user.role !== "organizer")) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full border border-cream-100/20 text-cream-100 hover:border-gold-300 hover:text-gold-300"
        aria-label="Notifications"
      >
        <Bell size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-espresso-200/15 bg-cream-50 py-2 text-left shadow-soft">
          <p className="px-4 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
            Notifications
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={clsx(
                  "w-full border-b border-espresso-200/5 px-4 py-3 text-left text-sm last:border-0 hover:bg-cream-100/80",
                  !n.is_read && "bg-gold-300/10"
                )}
                onClick={() => {
                  if (!n.is_read) void markNotificationRead(n.id).then(() => {
                    setItems((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
                    );
                  });
                }}
              >
                <span className="font-medium text-espresso-200">{n.title}</span>
                <span className="mt-1 block text-xs text-muted">{n.message}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  if (!user || (user.role !== "client" && user.role !== "organizer")) return null;

  const dash = dashboardPath(user.role);
  const profileHref = `${dash}/profile`;
  const messagesHref =
    user.role === "organizer" ? "/dashboard/organizer/messages" : "/dashboard/client/messages";

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[220px] items-center gap-2 rounded-full border border-cream-100/20 py-1 pl-1 pr-3 text-cream-100/90 hover:border-gold-300"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-300/90 text-espresso-200">
          <User size={14} />
        </span>
        <span className="truncate text-xs normal-case">{user.first_name || user.email}</span>
        <ChevronDown size={14} className="shrink-0 text-cream-100/60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-espresso-200/15 bg-cream-50 py-2 text-left shadow-soft">
          <Link
            href={dash}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-espresso-200 hover:bg-cream-100"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard size={14} className="text-gold-400" />{" "}
            {dashboardNavLabel(user.role)}
          </Link>
          <Link
            href={messagesHref}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-espresso-200 hover:bg-cream-100"
            onClick={() => setOpen(false)}
          >
            <MessageCircle size={14} className="text-gold-400" /> Messages
          </Link>
          <Link
            href={profileHref}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-espresso-200 hover:bg-cream-100"
            onClick={() => setOpen(false)}
          >
            <User size={14} className="text-gold-400" /> Profile
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-espresso-200 hover:bg-cream-100"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut size={14} className="text-gold-400" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const showHomeHero = pathname === "/" && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled && "shadow-lg shadow-black/20"
      )}
    >
      <div
        className={clsx(
          "relative overflow-hidden",
          showHomeHero ? "min-h-[320px] md:min-h-[380px]" : ""
        )}
      >
        <div className="absolute inset-0 z-0">
          {!scrolled ? (
            <>
              {/* Match marketing PageHero (About) when no background image */}
              <div className="absolute inset-0 bg-espresso-200" />
              <div className="absolute inset-0 bg-hero-grain opacity-90" />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={headerDotPatternStyle}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
          )}
        </div>

        <div className="relative z-10 text-cream-100">
          <div className="hidden border-b border-white/10 md:block">
            <div className="container-x flex h-11 items-center justify-between gap-4 text-xs tracking-[0.18em]">
              <div className="flex min-w-0 flex-1 items-center gap-6 uppercase">
                <span className="flex shrink-0 items-center gap-2">
                  <Phone size={13} className="text-gold-300" /> +92 300 1234567
                </span>
                <span className="hidden truncate text-cream-100/55 lg:inline">
                  Trusted by 1,800+ couples & corporates
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2 uppercase sm:gap-3">
                <Link
                  href="/dashboard/admin/login"
                  className="rounded-full border border-cream-100/25 px-3 py-1.5 text-[10px] font-semibold text-cream-50/90 transition hover:border-gold-300 hover:text-gold-300 sm:px-4 sm:text-[11px]"
                >
                  Staff
                </Link>
                {user ? (
                  <>
                    <NotificationBell />
                    <ProfileMenu />
                    {(user.role === "client" || user.role === "organizer") && (
                      <button
                        type="button"
                        onClick={() => logout()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cream-100/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream-50/90 transition hover:border-gold-300 hover:text-gold-300 sm:px-4 sm:text-[11px]"
                      >
                        <LogOut size={13} className="shrink-0" aria-hidden />
                        Sign out
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-full border border-gold-300/45 bg-black/20 px-3 py-1.5 text-[10px] font-semibold text-cream-50 transition hover:border-gold-300 sm:px-4 sm:text-[11px]"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-full bg-gold-300 px-3 py-1.5 text-[10px] font-semibold text-espresso-200 transition hover:bg-cream-50 sm:px-4 sm:text-[11px]"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="container-x flex h-20 items-center justify-between gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-300 text-espresso-200">
                <CalendarHeart size={18} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-serif text-2xl tracking-tight text-cream-50">
                  Book My Event
                </span>
                <span className="font-script text-base text-gold-300">
                  curated celebrations
                </span>
              </span>
            </Link>

            <nav className="hidden flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:flex xl:gap-x-10">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navItemClass(pathname, item.href)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={planEventNav.href}
                className={navItemClass(pathname, planEventNav.href)}
              >
                {planEventNav.label}
              </Link>
            </nav>

            <div className="hidden w-[160px] shrink-0 lg:block xl:w-[200px]" aria-hidden />

            <div className="flex items-center gap-2 lg:hidden">
              {!user && (
                <Link
                  href="/login"
                  className="rounded-full border border-cream-100/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream-50"
                >
                  Sign in
                </Link>
              )}
              {user && <NotificationBell />}
              {user && (user.role === "client" || user.role === "organizer") && (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex max-w-[5.5rem] items-center justify-center gap-1 rounded-full border border-cream-100/30 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-cream-50 sm:max-w-none sm:px-3 sm:text-[10px]"
                  aria-label="Sign out"
                >
                  <LogOut size={12} className="shrink-0" aria-hidden />
                  <span className="truncate sm:inline">Sign out</span>
                </button>
              )}
              <button
                className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-cream-50 backdrop-blur-sm"
                aria-label="Open menu"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {showHomeHero && (
            <div className="container-x max-w-3xl px-4 pb-14 pt-2 md:pb-16">
              <p className="font-script text-2xl text-gold-300 md:text-3xl">
                plan something unforgettable
              </p>
              <h1 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-cream-50 md:text-5xl">
                Weddings, corporate galas & celebrations — with verified organizers
                and a live budget.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-cream-100/85 md:text-base">
                Every service on the site comes from an approved organizer you can
                message, book, and manage in one place.
              </p>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0d0a08] backdrop-blur-lg lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4 text-cream-100">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-md px-3 py-3 text-sm font-medium uppercase tracking-[0.16em] hover:bg-white/10",
                  navItemClass(pathname, item.href)
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={planEventNav.href}
              className={clsx(
                "rounded-md px-3 py-3 text-sm font-medium uppercase tracking-[0.16em] hover:bg-white/10",
                navItemClass(pathname, planEventNav.href)
              )}
              onClick={() => setOpen(false)}
            >
              {planEventNav.label}
            </Link>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/dashboard/admin/login"
                className="btn-ghost border border-cream-100/25 text-center"
                onClick={() => setOpen(false)}
              >
                Staff sign in
              </Link>
              {user && (user.role === "client" || user.role === "organizer") ? (
                <>
                  <Link
                    href={dashboardPath(user.role)}
                    className="btn-ghost"
                    onClick={() => setOpen(false)}
                  >
                    {dashboardNavLabel(user.role)}
                  </Link>
                  <Link
                    href={
                      user.role === "organizer"
                        ? "/dashboard/organizer/messages"
                        : "/dashboard/client/messages"
                    }
                    className="btn-ghost"
                    onClick={() => setOpen(false)}
                  >
                    Messages
                  </Link>
                  <Link
                    href={`${dashboardPath(user.role)}/profile`}
                    className="btn-ghost"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-primary text-center"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="btn-ghost border border-cream-100/25 text-center"
                    onClick={() => setOpen(false)}
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
