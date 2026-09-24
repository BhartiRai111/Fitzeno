"use client";

import { useQuery } from "@tanstack/react-query";
import * as usersApi from "@/lib/api/users";
import { useAuth } from "@/lib/auth/auth-context";
import { useHasPermission } from "@/hooks/use-permissions";

/**
 * Non-member staff (everyone who can be assigned a lead or a member) —
 * gated on staff:view, same as GET /users itself (OWNER/MANAGER by
 * default — see UsersController's own comment). Degrades to just the
 * caller for a role without that permission (e.g. FRONT_DESK) rather than
 * a 403 toast; reassignment still works, it just can't browse the full
 * directory.
 */
export function useStaffDirectory() {
  const { user, status } = useAuth();
  const canViewStaff = useHasPermission("staff", "view");
  const enabled = status === "authenticated" && canViewStaff;

  const query = useQuery({
    queryKey: ["users", "staff-directory"],
    queryFn: () => usersApi.fetchUsers({ limit: 100 }),
    enabled,
    staleTime: 60_000,
  });

  const staff = enabled
    ? (query.data?.items ?? []).filter((u) => u.role !== "MEMBER")
    : user
      ? [{ id: user.id, firstName: user.firstName, lastName: user.lastName }]
      : [];

  return {
    staff: staff.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })),
    isLoading: enabled && query.isLoading,
  };
}
