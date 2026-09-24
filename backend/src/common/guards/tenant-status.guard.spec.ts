import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantStatusGuard } from './tenant-status.guard.js';
import type { AuthenticatedUser } from '../types/jwt-payload.interface.js';

function makeContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { id: 'u1', tenantId: 't1', email: 'owner@example.com', role: 'OWNER', tenantStatus: 'ACTIVE', ...overrides };
}

describe('TenantStatusGuard', () => {
  let reflector: Reflector;
  let guard: TenantStatusGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TenantStatusGuard(reflector);
  });

  it('allows an unauthenticated (public) request through — no user attached', () => {
    const context = makeContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows an ACTIVE gym', () => {
    const context = makeContext(makeUser({ tenantStatus: 'ACTIVE' }));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows an ONBOARDING gym — not a blocking state', () => {
    const context = makeContext(makeUser({ tenantStatus: 'ONBOARDING' }));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks an INACTIVE gym by default', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = makeContext(makeUser({ tenantStatus: 'INACTIVE' }));

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('blocks a SUSPENDED gym by default', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = makeContext(makeUser({ tenantStatus: 'SUSPENDED' }));

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('lets a route marked @SkipTenantStatusCheck() through even when suspended', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = makeContext(makeUser({ tenantStatus: 'SUSPENDED' }));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lets a route marked @SkipTenantStatusCheck() through even when inactive', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = makeContext(makeUser({ tenantStatus: 'INACTIVE' }));

    expect(guard.canActivate(context)).toBe(true);
  });
});
