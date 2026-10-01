import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './bootstrap.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app, configService);
  // Kept out of production — an unauthenticated, fully browsable API schema
  // is unnecessary reconnaissance surface for a public deployment; local/dev
  // and any internal-only environment still get it.
  if (!configService.get<boolean>('app.isProduction')) {
    setupSwagger(app);
  }

  const port = configService.get<number>('app.port')!;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Fitzeno API listening on http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`API docs at http://localhost:${port}/api/docs`);
}

await bootstrap();
