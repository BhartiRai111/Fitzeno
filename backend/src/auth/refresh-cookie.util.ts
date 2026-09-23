import type { CookieOptions } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Scoped to /api/v1/auth (not the whole API) — the browser only attaches
 * this cookie on requests to the auth endpoints that actually need it
 * (refresh, logout), not on every API call, shrinking the cookie's
 * exposure surface.
 */
export function refreshCookieOptions(isProduction: boolean, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
  };
}
