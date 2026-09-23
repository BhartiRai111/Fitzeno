import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './bootstrap.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app, configService);
  setupSwagger(app);

  const port = configService.get<number>('app.port')!;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Fitzeno API listening on http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`API docs at http://localhost:${port}/api/docs`);
}

await bootstrap();
