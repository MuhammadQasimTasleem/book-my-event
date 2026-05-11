"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Sparkles } from "lucide-react";
import { useActiveClientEvent } from "@/components/active-client-event-provider";
import { useEventBookingCart } from "@/components/event-booking-cart-provider";
import { useAuth } from "@/components/providers";
import { isClientUser } from "@/lib/auth-roles";
import { formatPKR } from "@/lib/data";

/** Shown in dock subtotal hint when user has not opened checkout yet */
const DOCK_GUEST_HINT = 150;

/** Organizer profile URLs: /organizers/123 (not the directory index). */
function isOrganizerProfilePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/organizers\/\d+/.test(pathname);
}

export function EventCartDock() {
  const { lines, cartSubtotal, hydrated } = useEventBookingCart();
  const { activeEvent, hydrated: eventHydrated } = useActiveClientEvent();
  const { user } = useAuth();
  const pathname = usePathname();

  if (!hydrated) return null;

  const onCheckout = pathname === "/book-event";
  const onOrganizerProfile = isOrganizerProfilePath(pathname);
  const hasLines = lines.length > 0;

  /** Slim bar on organizer profile when cart is empty — keeps bottom CTA visible. */
  if (!hasLines && onOrganizerProfile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-espresso-200/25 bg-[#faf7f2] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(62,47,35,0.12)]">
        <div className="mx-auto flex max-w-4xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-espresso-200/15 bg-white shadow-sm">
              <Sparkles className="h-5 w-5 text-gold-600" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-espresso-200">
                Plan a custom event
              </p>
              <p className="truncate text-xs text-espresso-200/65">
                Add services below to your plan, then review and submit once.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 sm:justify-end">
            <Link
              href="/book-event"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 px-6 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-espresso-950 shadow-md ring-1 ring-gold-600/25 transition hover:from-gold-300 hover:to-gold-400 sm:flex-none sm:min-w-[200px]"
            >
              Review &amp; submit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hasLines) return null;

  const sub = cartSubtotal(DOCK_GUEST_HINT);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] border-t border-espresso-200/25 bg-[#faf7f2] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-espresso-200 shadow-[0_-10px_40px_rgba(62,47,35,0.14)] ${
        onCheckout ? "sm:py-2.5" : ""
      }`}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-espresso-200/15 bg-white shadow-sm">
            <ShoppingBag className="h-5 w-5 text-gold-600" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-espresso-200">
              {lines.length} service{lines.length === 1 ? "" : "s"} in your event
              plan
            </p>
            <p className="truncate text-xs text-espresso-200/70">
              Est. subtotal <span className="font-medium">{formatPKR(sub)}</span>
              <span className="text-espresso-200/55">
                {" "}
                (at {DOCK_GUEST_HINT} guests for per-guest items)
              </span>
            </p>
            {isClientUser(user) && eventHydrated ? (
              activeEvent ? (
                <p className="truncate text-[11px] text-espresso-200/80">
                  Event:{" "}
                  <span className="font-medium text-espresso-200">
                    {activeEvent.title}
                  </span>
                </p>
              ) : (
                <p className="truncate text-[11px] text-amber-900/85">
                  Set an event title on checkout or your{" "}
                  <Link href="/dashboard/client" className="font-medium underline">
                    dashboard
                  </Link>{" "}
                  before submitting.
                </p>
              )
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:justify-end">
          {!onCheckout ? (
            <Link
              href="/book-event"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 px-6 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-espresso-950 shadow-md ring-1 ring-gold-600/25 transition hover:from-gold-300 hover:to-gold-400 sm:flex-none sm:min-w-[220px]"
            >
              Review &amp; submit
            </Link>
          ) : (
            <span className="self-center text-right text-xs font-medium text-espresso-200/75 sm:max-w-xs">
              Complete details below to send all requests
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
