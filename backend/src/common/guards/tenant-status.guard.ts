import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_TENANT_STATUS_CHECK_KEY } from '../decorators/skip-tenant-status-check.decorator.js';
import type { AuthenticatedUser } from '../types/jwt-payload.interface.js';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * Runs after JwtAuthGuard. Blocks every route for a SUSPENDED or INACTIVE
 * gym except ones marked `@SkipTenantStatusCheck()` — see that decorator's
 * comment for why a couple of routes need to stay reachable. A `@Public()`
 * route never reaches here with a `user` attached (JwtAuthGuard skips
 * Passport entirely for those), so it's a no-op for them without needing to
 * re-check `@Public()` metadata itself.
 */
@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      return true;
    }

    if (user.tenantStatus !== 'SUSPENDED' && user.tenantStatus !== 'INACTIVE') {
      return true;
    }

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_STATUS_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    throw new ForbiddenException(
      user.tenantStatus === 'SUSPENDED'
        ? 'This gym has been suspended. Contact support.'
        : 'This gym is currently paused. Contact your gym owner.',
    );
  }
}
