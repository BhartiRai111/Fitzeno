"use client";

import * as React from "react";
import * as authApi from "@/lib/api/auth";
import * as tenantsApi from "@/lib/api/tenants";
import { refreshAccessToken, setSessionExpiredHandler } from "@/lib/api/client";
import { toStaffAccessRole } from "@/lib/api/enum-maps";
import { ApiError } from "@/lib/api/types";
import type { StaffAccessRole } from "@/lib/data/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: authApi.BackendUser | null;
  tenant: tenantsApi.BackendTenant | null;
  /** null for a MEMBER — see toStaffAccessRole. Use `user.role === "MEMBER"` to detect a portal member. */
  staffRole: StaffAccessRole | null;
  login: (input: authApi.LoginInput) => Promise<authApi.BackendUser>;
  registerMember: (input: authApi.RegisterMemberInput) => Promise<authApi.BackendUser>;
  registerBusiness: (input: authApi.RegisterBusinessInput) => Promise<authApi.BackendUser>;
  logout: () => Promise<void>;
  /** Re-fetches /auth/me and /tenants/me — call after an action that changes the caller's own profile or gym info. */
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function loadSession(): Promise<{ user: authApi.BackendUser; tenant: tenantsApi.BackendTenant }> {
  const [user, tenant] = await Promise.all([authApi.fetchCurrentUser(), tenantsApi.fetchCurrentTenant()]);
  return { user, tenant };
}

/**
 * The one place session state lives. On mount, silently exchanges the
 * httpOnly refresh cookie (if any survived from a previous visit — see
 * client.ts's own comment on why the access token itself is memory-only)
 * for a fresh access token, then loads the user + their gym. Every other
 * data-fetching hook in the app assumes this has already resolved
 * (gated on `status === "authenticated"` — see use-query-enabled patterns
 * throughout src/hooks/) rather than re-deriving auth state itself.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [user, setUser] = React.useState<authApi.BackendUser | null>(null);
  const [tenant, setTenant] = React.useState<tenantsApi.BackendTenant | null>(null);

  const clearSession = React.useCallback(() => {
    setUser(null);
    setTenant(null);
    setStatus("unauthenticated");
  }, []);

  React.useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        if (!cancelled) clearSession();
        return;
      }
      try {
        const { user: freshUser, tenant: freshTenant } = await loadSession();
        if (!cancelled) {
          setUser(freshUser);
          setTenant(freshTenant);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = React.useCallback(async (input: authApi.LoginInput) => {
    const result = await authApi.login(input);
    const freshTenant = await tenantsApi.fetchCurrentTenant();
    setUser(result.user);
    setTenant(freshTenant);
    setStatus("authenticated");
    return result.user;
  }, []);

  const registerMember = React.useCallback(async (input: authApi.RegisterMemberInput) => {
    const result = await authApi.registerMember(input);
    const freshTenant = await tenantsApi.fetchCurrentTenant();
    setUser(result.user);
    setTenant(freshTenant);
    setStatus("authenticated");
    return result.user;
  }, []);

  const registerBusiness = React.useCallback(async (input: authApi.RegisterBusinessInput) => {
    const result = await authApi.registerBusiness(input);
    const freshTenant = await tenantsApi.fetchCurrentTenant();
    setUser(result.user);
    setTenant(freshTenant);
    setStatus("authenticated");
    return result.user;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refresh = React.useCallback(async () => {
    try {
      const { user: freshUser, tenant: freshTenant } = await loadSession();
      setUser(freshUser);
      setTenant(freshTenant);
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        clearSession();
      }
    }
  }, [clearSession]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      tenant,
      staffRole: user ? toStaffAccessRole(user.role) : null,
      login,
      registerMember,
      registerBusiness,
      logout,
      refresh,
    }),
    [status, user, tenant, login, registerMember, registerBusiness, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider.");
  return ctx;
}
