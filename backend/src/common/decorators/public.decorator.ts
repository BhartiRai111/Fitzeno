import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without a valid access token — the escape
 * hatch for the global JwtAuthGuard (health checks, login/register once
 * those endpoints exist, public webhooks, etc.).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
