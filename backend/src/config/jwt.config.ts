import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  /** Access token lifetime in seconds — default 15 minutes. */
  accessTokenTtlSeconds: parseInt(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? '900', 10),
  /** Refresh token lifetime in days — default 30. Stored as a DB row, not a JWT claim, so it's revocable. */
  refreshTokenTtlDays: parseInt(process.env.JWT_REFRESH_TOKEN_TTL_DAYS ?? '30', 10),
  /** Password-reset / invite-link token lifetime in hours — default 2. */
  resetTokenTtlHours: parseInt(process.env.PASSWORD_RESET_TTL_HOURS ?? '2', 10),
}));
