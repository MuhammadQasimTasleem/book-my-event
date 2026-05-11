"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EVENT_CART_STORAGE_KEY,
  type EventCartLine,
  type EventCartTier,
  lineSubtotal,
} from "@/lib/event-cart";

type EventBookingCartContextValue = {
  lines: EventCartLine[];
  hydrated: boolean;
  addLine: (line: EventCartLine) => void;
  removeLine: (serviceId: number) => void;
  setLineTier: (serviceId: number, tier: EventCartTier) => void;
  clearCart: () => void;
  cartSubtotal: (guestCount: number) => number;
};

const EventBookingCartContext =
  createContext<EventBookingCartContextValue | null>(null);

export function EventBookingCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<EventCartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EVENT_CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EventCartLine[];
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (lines.length === 0) localStorage.removeItem(EVENT_CART_STORAGE_KEY);
      else localStorage.setItem(EVENT_CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const addLine = useCallback((line: EventCartLine) => {
    setLines((prev) => {
      const i = prev.findIndex((x) => x.serviceId === line.serviceId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = line;
        return next;
      }
      return [...prev, line];
    });
  }, []);

  const removeLine = useCallback((serviceId: number) => {
    setLines((prev) => prev.filter((x) => x.serviceId !== serviceId));
  }, []);

  const setLineTier = useCallback((serviceId: number, tier: EventCartTier) => {
    setLines((prev) =>
      prev.map((x) => (x.serviceId === serviceId ? { ...x, tier } : x))
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const cartSubtotal = useCallback(
    (guestCount: number) =>
      lines.reduce((sum, line) => sum + lineSubtotal(line, guestCount), 0),
    [lines]
  );

  const value = useMemo(
    () => ({
      lines,
      hydrated,
      addLine,
      removeLine,
      setLineTier,
      clearCart,
      cartSubtotal,
    }),
    [lines, hydrated, addLine, removeLine, setLineTier, clearCart, cartSubtotal]
  );

  return (
    <EventBookingCartContext.Provider value={value}>
      {children}
    </EventBookingCartContext.Provider>
  );
}

export function useEventBookingCart(): EventBookingCartContextValue {
  const ctx = useContext(EventBookingCartContext);
  if (!ctx) {
    throw new Error(
      "useEventBookingCart must be used within EventBookingCartProvider"
    );
  }
  return ctx;
}
