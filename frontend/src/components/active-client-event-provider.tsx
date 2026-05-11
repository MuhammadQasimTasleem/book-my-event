"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers";
import { isClientUser } from "@/lib/auth-roles";

const STORAGE_KEY = "bme_active_client_event_v1";

export type ActiveClientEvent = { id: number; title: string };

type ActiveClientEventContextValue = {
  activeEvent: ActiveClientEvent | null;
  hydrated: boolean;
  setActiveEvent: (id: number, title: string) => void;
  clearActiveEvent: () => void;
};

const ActiveClientEventContext =
  createContext<ActiveClientEventContextValue | null>(null);

export function ActiveClientEventProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [activeEvent, setActiveState] = useState<ActiveClientEvent | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const prevUserRef = useRef<typeof user>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { id?: unknown; title?: unknown };
        if (
          typeof p.id === "number" &&
          Number.isFinite(p.id) &&
          typeof p.title === "string" &&
          p.title.trim()
        ) {
          setActiveState({ id: p.id, title: p.title.trim() });
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!activeEvent) localStorage.removeItem(STORAGE_KEY);
    else
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: activeEvent.id, title: activeEvent.title })
      );
  }, [activeEvent, hydrated]);

  useEffect(() => {
    if (authLoading) return;
    if (user && !isClientUser(user)) {
      setActiveState(null);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    const prev = prevUserRef.current;
    if (prev && !user) {
      setActiveState(null);
    }
    prevUserRef.current = user;
  }, [user, authLoading]);

  const setActiveEvent = useCallback((id: number, title: string) => {
    setActiveState({ id, title: title.trim() || "My event" });
  }, []);

  const clearActiveEvent = useCallback(() => setActiveState(null), []);

  const value = useMemo(
    () => ({
      activeEvent,
      hydrated,
      setActiveEvent,
      clearActiveEvent,
    }),
    [activeEvent, hydrated, setActiveEvent, clearActiveEvent]
  );

  return (
    <ActiveClientEventContext.Provider value={value}>
      {children}
    </ActiveClientEventContext.Provider>
  );
}

export function useActiveClientEvent(): ActiveClientEventContextValue {
  const ctx = useContext(ActiveClientEventContext);
  if (!ctx) {
    throw new Error(
      "useActiveClientEvent must be used within ActiveClientEventProvider"
    );
  }
  return ctx;
}
