import type { PermissionArea, PermissionLevel, StaffAccessRole } from "@/lib/data/types";

/**
 * The backend's Prisma enums are UPPER_SNAKE; the approved frontend's own
 * mock-data types (src/lib/data/types.ts, src/lib/permissions.ts) use
 * lowercase/kebab values throughout every component that already renders
 * them (badges, permission matrices, role labels). Rather than touch every
 * one of those call sites, these maps convert at the API boundary — the
 * one place backend and frontend vocabularies meet — so everything past
 * that boundary keeps working exactly as designed.
 */

export type BackendUserRole = "OWNER" | "MANAGER" | "TRAINER" | "FRONT_DESK" | "MEMBER";
export type BackendPermissionArea =
  | "MEMBERS"
  | "BOOKINGS"
  | "ATTENDANCE"
  | "MEMBERSHIPS"
  | "PAYMENTS"
  | "STORE"
  | "FINANCE"
  | "REPORTS"
  | "STAFF"
  | "ANNOUNCEMENTS"
  | "SETTINGS";
export type BackendPermissionLevel = "NONE" | "VIEW" | "MANAGE";

const STAFF_ROLE_MAP: Record<Exclude<BackendUserRole, "MEMBER">, StaffAccessRole> = {
  OWNER: "owner",
  MANAGER: "manager",
  TRAINER: "trainer",
  FRONT_DESK: "front-desk",
};

/** Null for a MEMBER — a portal member has no place in the staff-role system (see StaffAccessRole's own definition). */
export function toStaffAccessRole(role: BackendUserRole): StaffAccessRole | null {
  return role === "MEMBER" ? null : STAFF_ROLE_MAP[role];
}

export function toBackendUserRole(role: StaffAccessRole): BackendUserRole {
  const entry = Object.entries(STAFF_ROLE_MAP).find(([, v]) => v === role);
  if (!entry) throw new Error(`Unknown staff role: ${role}`);
  return entry[0] as BackendUserRole;
}

const PERMISSION_AREA_MAP: Record<BackendPermissionArea, PermissionArea> = {
  MEMBERS: "members",
  BOOKINGS: "bookings",
  ATTENDANCE: "attendance",
  MEMBERSHIPS: "memberships",
  PAYMENTS: "payments",
  STORE: "store",
  FINANCE: "finance",
  REPORTS: "reports",
  STAFF: "staff",
  ANNOUNCEMENTS: "announcements",
  SETTINGS: "settings",
};

export function toPermissionArea(area: BackendPermissionArea): PermissionArea {
  return PERMISSION_AREA_MAP[area];
}

export function toBackendPermissionArea(area: PermissionArea): BackendPermissionArea {
  const entry = Object.entries(PERMISSION_AREA_MAP).find(([, v]) => v === area);
  if (!entry) throw new Error(`Unknown permission area: ${area}`);
  return entry[0] as BackendPermissionArea;
}

const PERMISSION_LEVEL_MAP: Record<BackendPermissionLevel, PermissionLevel> = {
  NONE: "none",
  VIEW: "view",
  MANAGE: "manage",
};

export function toPermissionLevel(level: BackendPermissionLevel): PermissionLevel {
  return PERMISSION_LEVEL_MAP[level];
}

/** Converts the backend's `Record<BackendPermissionArea, BackendPermissionLevel>` (from GET /users/:id/permissions) into the frontend's own `Record<PermissionArea, PermissionLevel>` shape. */
export function toPermissionMap(
  backendMap: Record<BackendPermissionArea, BackendPermissionLevel>,
): Record<PermissionArea, PermissionLevel> {
  const result = {} as Record<PermissionArea, PermissionLevel>;
  for (const [area, level] of Object.entries(backendMap) as [BackendPermissionArea, BackendPermissionLevel][]) {
    result[toPermissionArea(area)] = toPermissionLevel(level);
  }
  return result;
}

/** Full-name initials, e.g. "Jordan Smith" → "JS" — the shape DashboardTopbar/avatars already expect throughout the approved frontend. */
export function toInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
