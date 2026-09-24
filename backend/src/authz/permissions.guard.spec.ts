import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsGuard } from './permissions.guard.js';
import type { PermissionsService } from './permissions.service.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';

function makeContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: Reflector;
  let permissionsService: PermissionsService;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    permissionsService = { hasPermission: vi.fn() } as unknown as PermissionsService;
    guard = new PermissionsGuard(reflector, permissionsService);
  });

  it('allows the request when the route declares no required permission', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = makeContext(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionsService.hasPermission).not.toHaveBeenCalled();
  });

  it('denies when a permission is required but there is no authenticated user', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ area: 'STAFF', level: 'VIEW' });
    const context = makeContext(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it("delegates to PermissionsService with the user's id and role, returning its verdict", async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ area: 'STAFF', level: 'MANAGE' });
    vi.mocked(permissionsService.hasPermission).mockResolvedValue(true);
    const context = makeContext({ id: 'u1', tenantId: 't1', email: 'owner@example.com', role: 'OWNER' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionsService.hasPermission).toHaveBeenCalledWith('u1', 'OWNER', 'STAFF', 'MANAGE');
  });

  it('denies when PermissionsService reports the level is insufficient', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ area: 'STAFF', level: 'MANAGE' });
    vi.mocked(permissionsService.hasPermission).mockResolvedValue(false);
    const context = makeContext({ id: 'u1', tenantId: 't1', email: 'trainer@example.com', role: 'TRAINER' });

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
});
