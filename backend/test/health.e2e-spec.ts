import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns a success envelope with database connectivity, unauthenticated', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok', database: 'connected' },
    });
  });

  it('an unknown route returns the standard error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/this-route-does-not-exist')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
      path: '/api/v1/this-route-does-not-exist',
    });
  });
});
