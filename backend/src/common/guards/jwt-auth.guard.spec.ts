import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';

function makeContext(): ExecutionContext {
  return {
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('bypasses passport entirely for routes marked @Public()', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const superCanActivate = vi.spyOn(
      AuthGuard('jwt').prototype,
      'canActivate',
    );

    expect(guard.canActivate(makeContext())).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('defers to the passport JWT strategy for non-public routes', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superCanActivate = vi
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);

    expect(guard.canActivate(makeContext())).toBe(true);
    expect(superCanActivate).toHaveBeenCalledOnce();
  });
});
