"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { toPermissionMap, type BackendPermissionArea, type BackendPermissionLevel } from "@/lib/api/enum-maps";
import { useAuth } from "@/lib/auth/auth-context";
import type { PermissionArea, PermissionLevel } from "@/lib/data/types";

const LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, view: 1, manage: 2 };

/**
 * The authenticated user's effective permissions — role defaults merged
 * with any per-user PermissionOverride rows, exactly as the backend
 * computes it (GET /users/:id/permissions — the same endpoint the Staff
 * page's permission matrix already uses for other users). This is the one
 * place the frontend asks "what can this person do," so no component ever
 * hardcodes a role check itself; see useHasPermission below. Skipped for
 * a MEMBER — the member portal has no permission-area concept of its own
 * (every member route is either self-service or off-limits), so there's
 * nothing meaningful to fetch.
 */
export function usePermissions() {
  const { user, staffRole, status } = useAuth();

  return useQuery({
    queryKey: ["permissions", user?.id],
    queryFn: async () => {
      const raw = await apiFetch<Record<BackendPermissionArea, BackendPermissionLevel>>(`/users/${user!.id}/permissions`);
      return toPermissionMap(raw);
    },
    enabled: status === "authenticated" && !!user && staffRole !== null,
    staleTime: 5 * 60_000,
  });
}

/** `true` once permissions are loaded and the caller's level for `area` is at least `minLevel` — `false` while loading, on error, or for a MEMBER (who has none). Never throws; a denied/unloaded state degrades to "hide this," which is the safe default for a UX-only check (the backend is still the real gate). */
export function useHasPermission(area: PermissionArea, minLevel: PermissionLevel = "view"): boolean {
  const { data } = usePermissions();
  if (!data) return false;
  return LEVEL_RANK[data[area]] >= LEVEL_RANK[minLevel];
}
