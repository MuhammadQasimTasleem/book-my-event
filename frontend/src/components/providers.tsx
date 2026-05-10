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
import type { UserMe } from "@/lib/api/types";
import { normalizeUserMe } from "@/lib/auth-roles";
import {
  adminLoginRequest,
  adminLogout as apiAdminLogout,
  fetchMe,
  fetchMeAdmin,
  getAdminStoredTokens,
  getStoredTokens,
  loginRequest,
  logout as apiLogout,
  setAdminStoredTokens,
  setStoredTokens,
} from "@/lib/api/client";

export const ADMIN_USE_CONSOLE_CODE = "ADMIN_USE_CONSOLE";

type AuthState = {
  user: UserMe | null;
  adminUser: UserMe | null;
  loading: boolean;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  refreshUser: () => Promise<void>;
  refreshAdminUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserMe>;
  adminLogin: (email: string, password: string) => Promise<UserMe>;
  logout: () => void;
  adminLogout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [adminUser, setAdminUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens?.access) {
      setUser(null);
      return;
    }
    try {
      const me = normalizeUserMe(await fetchMe());
      setUser(me);
      const t = getStoredTokens();
      if (t?.access) setStoredTokens(t);
    } catch {
      setUser(null);
      setStoredTokens(null);
    }
  }, []);

  const refreshAdminUser = useCallback(async () => {
    const tokens = getAdminStoredTokens();
    if (!tokens?.access) {
      setAdminUser(null);
      return;
    }
    try {
      const me = await fetchMeAdmin();
      setAdminUser(me);
      const t = getAdminStoredTokens();
      if (t?.access) setAdminStoredTokens(t);
    } catch {
      setAdminUser(null);
      setAdminStoredTokens(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([refreshUser(), refreshAdminUser()]);
      if (!cancelled) {
        setLoading(false);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, refreshAdminUser]);

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest(email, password);
    const me = normalizeUserMe(await fetchMe());
    if (me.role === "admin") {
      setStoredTokens(null);
      throw Object.assign(new Error("Administrator accounts must use the admin sign-in page."), {
        code: ADMIN_USE_CONSOLE_CODE,
      });
    }
    setUser(me);
    return me;
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    await adminLoginRequest(email, password);
    const me = normalizeUserMe(await fetchMeAdmin());
    if (me.role !== "admin") {
      setAdminStoredTokens(null);
      throw new Error("This sign-in is for administrator accounts only.");
    }
    setAdminUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const adminLogout = useCallback(() => {
    apiAdminLogout();
    setAdminUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      adminUser,
      loading,
      ready,
      refreshUser,
      refreshAdminUser,
      login,
      adminLogin,
      logout,
      adminLogout,
    }),
    [
      user,
      adminUser,
      loading,
      ready,
      refreshUser,
      refreshAdminUser,
      login,
      adminLogin,
      logout,
      adminLogout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
