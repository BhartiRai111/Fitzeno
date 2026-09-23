import type { UserRole } from '../../generated/prisma/enums.js';

/** The shape encoded into every access token this API issues. */
export interface JwtPayload {
  /** Subject — the User.id. */
  sub: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

/** `JwtStrategy.validate()`'s return value, attached to `request.user`. */
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
}
