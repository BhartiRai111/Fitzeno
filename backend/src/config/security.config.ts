import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  /** Origins allowed to call this API — the Next.js frontend in dev/prod. */
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  throttleTtlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
}));
