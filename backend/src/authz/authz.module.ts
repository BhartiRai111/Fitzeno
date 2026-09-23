import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service.js';
import { PermissionsGuard } from './permissions.guard.js';

/**
 * The shared authorization toolkit: PermissionsService (effective
 * permission computation) and PermissionsGuard (the @RequirePermission()
 * enforcement point, registered globally in AppModule). Exported so any
 * future module can inject PermissionsService directly — e.g. to compute
 * "what can this user see" for a response payload, not just to gate a route.
 */
@Module({
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class AuthzModule {}
