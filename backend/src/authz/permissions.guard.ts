import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service.js';
import { REQUIRE_PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * Runs after JwtAuthGuard/RolesGuard (registered last in AppModule). A
 * route with no `@RequirePermission(...)` is unaffected — this guard is a
 * no-op for the majority of routes that only care about role, not
 * fine-grained area access.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      return false;
    }

    return this.permissionsService.hasPermission(user.id, user.role, required.area, required.level);
  }
}
