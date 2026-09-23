import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  /** Access token lifetime in seconds — default 15 minutes. */
  accessTokenTtlSeconds: parseInt(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? '900', 10),
}));
