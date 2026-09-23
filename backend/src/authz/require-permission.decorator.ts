import { SetMetadata } from '@nestjs/common';
import type { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export interface RequiredPermission {
  area: PermissionArea;
  level: PermissionLevel;
}

/**
 * Gates a route on the caller's effective permission for one area — the
 * fine-grained counterpart to `@Roles()`. Use this for anything a future
 * module exposes that the frontend's PermissionArea system already governs
 * (members, bookings, attendance, memberships, payments, store, finance,
 * reports, staff, announcements, settings — see PermissionArea). Use
 * `@Roles()` instead for coarser checks that aren't about one of those
 * areas (e.g. "trainer or owner only").
 *
 * `level: 'VIEW'` is satisfied by VIEW or MANAGE; `level: 'MANAGE'` requires
 * MANAGE specifically — see PermissionsService.levelSatisfies.
 */
export const RequirePermission = (area: PermissionArea, level: PermissionLevel) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { area, level } satisfies RequiredPermission);
