import type { TenantStatus, UserRole } from '../../generated/prisma/enums.js';

/** The shape encoded into every access token this API issues. */
export interface JwtPayload {
  /** Subject — the User.id. */
  sub: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

/**
 * `JwtStrategy.validate()`'s return value, attached to `request.user`.
 *
 * `tenantStatus` is deliberately NOT part of the signed JwtPayload above —
 * it's looked up fresh from the database on every request (the same query
 * that re-validates the user, see UsersService.findByIdWithTenantStatus) so
 * a gym suspended or paused mid-session takes effect on its very next
 * request rather than waiting out the access token's TTL. TenantStatusGuard
 * is what actually acts on it; JwtStrategy just attaches it.
 */
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  tenantStatus: TenantStatus;
}
