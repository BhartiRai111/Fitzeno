import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';
import type { AuthenticatedUser } from '../types/jwt-payload.interface.js';

function makeContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows the request when the route declares no required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = makeContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies when the route requires roles but there is no authenticated user', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER']);
    const context = makeContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });

  it("denies when the user's role is not in the required list", () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER', 'MANAGER']);
    const context = makeContext({
      id: 'u1',
      tenantId: 't1',
      email: 'front-desk@example.com',
      role: 'FRONT_DESK',
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it("allows when the user's role is in the required list", () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER', 'MANAGER']);
    const context = makeContext({
      id: 'u1',
      tenantId: 't1',
      email: 'owner@example.com',
      role: 'OWNER',
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
