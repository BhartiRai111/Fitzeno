import { PermissionArea, PermissionLevel, UserRole } from '../generated/prisma/enums.js';

/**
 * Mirrors the frontend's ROLE_DEFAULT_PERMISSIONS 1:1
 * (../../src/lib/permissions.ts on the frontend) — if you change one, change
 * the other. Kept as a plain object here (not read from the database) for
 * the same reason the frontend keeps it as a const: these are the product's
 * default access rules, not per-tenant configuration: every tenant's owner
 * gets full access, every tenant's trainer gets the same baseline, etc.
 * Per-user exceptions live in the PermissionOverride table and are merged
 * on top of this at request time by PermissionsService.
 */
const FULL_ACCESS: Record<PermissionArea, PermissionLevel> = {
  MEMBERS: 'MANAGE',
  BOOKINGS: 'MANAGE',
  ATTENDANCE: 'MANAGE',
  MEMBERSHIPS: 'MANAGE',
  PAYMENTS: 'MANAGE',
  STORE: 'MANAGE',
  FINANCE: 'MANAGE',
  REPORTS: 'MANAGE',
  STAFF: 'MANAGE',
  ANNOUNCEMENTS: 'MANAGE',
  SETTINGS: 'MANAGE',
};

const NO_ACCESS: Record<PermissionArea, PermissionLevel> = {
  MEMBERS: 'NONE',
  BOOKINGS: 'NONE',
  ATTENDANCE: 'NONE',
  MEMBERSHIPS: 'NONE',
  PAYMENTS: 'NONE',
  STORE: 'NONE',
  FINANCE: 'NONE',
  REPORTS: 'NONE',
  STAFF: 'NONE',
  ANNOUNCEMENTS: 'NONE',
  SETTINGS: 'NONE',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Record<PermissionArea, PermissionLevel>> = {
  OWNER: FULL_ACCESS,
  MANAGER: {
    MEMBERS: 'MANAGE',
    BOOKINGS: 'MANAGE',
    ATTENDANCE: 'MANAGE',
    MEMBERSHIPS: 'MANAGE',
    PAYMENTS: 'MANAGE',
    STORE: 'MANAGE',
    FINANCE: 'MANAGE',
    REPORTS: 'VIEW',
    STAFF: 'VIEW',
    ANNOUNCEMENTS: 'MANAGE',
    SETTINGS: 'VIEW',
  },
  TRAINER: {
    MEMBERS: 'VIEW',
    BOOKINGS: 'MANAGE',
    ATTENDANCE: 'MANAGE',
    MEMBERSHIPS: 'NONE',
    PAYMENTS: 'NONE',
    STORE: 'NONE',
    FINANCE: 'NONE',
    REPORTS: 'NONE',
    STAFF: 'NONE',
    ANNOUNCEMENTS: 'NONE',
    SETTINGS: 'NONE',
  },
  FRONT_DESK: {
    MEMBERS: 'MANAGE',
    BOOKINGS: 'MANAGE',
    ATTENDANCE: 'MANAGE',
    MEMBERSHIPS: 'VIEW',
    PAYMENTS: 'MANAGE',
    STORE: 'MANAGE',
    FINANCE: 'NONE',
    REPORTS: 'NONE',
    STAFF: 'NONE',
    ANNOUNCEMENTS: 'NONE',
    SETTINGS: 'NONE',
  },
  // Members don't use the area-permission system at all — they only ever
  // reach member-portal endpoints, which future phases gate with @Roles()
  // rather than @RequirePermission(). This entry exists so the Record type
  // stays total (every UserRole has an entry) instead of partial, which
  // would push an undefined-handling burden onto every caller.
  MEMBER: NO_ACCESS,
};
