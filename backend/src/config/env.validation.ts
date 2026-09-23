import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * The full set of environment variables this API reads, with the
 * constraints that make a misconfigured deployment fail fast at boot
 * instead of surfacing as a confusing runtime error later.
 */
class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  PORT: number = 3001;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16, {
    message:
      'JWT_SECRET must be at least 16 characters — generate one with `openssl rand -base64 48`.',
  })
  JWT_SECRET!: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  JWT_ACCESS_TOKEN_TTL_SECONDS: number = 900;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsOptional()
  @IsInt()
  @Min(1000)
  THROTTLE_TTL_MS: number = 60000;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 120;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const message = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${message}`);
  }

  return validated;
}
