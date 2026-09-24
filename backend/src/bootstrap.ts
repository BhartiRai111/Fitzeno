import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/**
 * Everything applied to the Nest application instance that isn't
 * module/provider registration — global middleware, prefix/versioning,
 * validation, and API docs. Pulled out of main.ts so e2e tests exercise the
 * exact same setup the real server runs, instead of a hand-rolled subset
 * that quietly drifts from production behavior.
 */
export function configureApp(app: INestApplication, configService: ConfigService): void {
  app.use(helmet());
  app.use(compression());
  // Only used to read the httpOnly refresh-token cookie — never signed
  // cookies, so no secret needed here.
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string[]>('security.corsOrigins'),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fitzeno API')
    .setDescription(
      'Gym management platform backend — members, staff, classes, bookings, payments, and more.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      description: 'httpOnly refresh-token cookie, set by /auth/login and /auth/register.',
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
}
