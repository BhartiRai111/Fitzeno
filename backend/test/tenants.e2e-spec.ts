import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PasswordService } from '../src/auth/password.service.js';
import type { User } from '../src/generated/prisma/client.js';

/**
 * Exercises the gym/business (Tenant) management surface end-to-end,
 * always with TWO real, independently created gyms in the database — the
 * only convincing way to prove cross-tenant isolation is to have a second
 * tenant whose data a first tenant's user could try (and fail) to reach.
 *
 * Throttle budgets this file spends, each within its own fresh in-memory
 * counter (a new Nest application per e2e file): /auth/register-business
 * (3/min) creates both gyms plus a duplicate-email check; /auth/register
 * (3/min, separate counter) creates ordinary members; /auth/login (5/min)
 * is used sparingly and only where a real login round-trip is the point
 * (proving a paused gym blocks login, and that reactivating restores it).
 */
describe('Tenants / gym management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;

  const MARKER = 'e2e-tenants-test';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    passwordService = app.get(PasswordService);

    await prisma.user.deleteMany({ where: { email: { contains: MARKER } } });
    await prisma.tenant.deleteMany({ where: { slug: { contains: MARKER } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: MARKER } } });
    await prisma.tenant.deleteMany({ where: { slug: { contains: MARKER } } });
    await app.close();
  });

  function server() {
    return app.getHttpServer();
  }

  function mintAccessToken(user: Pick<User, 'id' | 'tenantId' | 'email' | 'role'>): string {
    return jwtService.sign({ sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role });
  }

  async function createActiveUser(tenantId: string, role: 'MANAGER' | 'MEMBER', email: string): Promise<User> {
    const passwordHash = await passwordService.hash('Password123!');
    return prisma.user.create({
      data: { tenantId, email, passwordHash, firstName: 'Test', lastName: role, role, status: 'ACTIVE' },
    });
  }

  // -------------------------------------------------------------------
  // Set up two independent gyms via the real owner-onboarding endpoint.
  // Every other test in this file operates on gymA/gymB below.
  // -------------------------------------------------------------------
  let gymA: { tenantId: string; slug: string; ownerToken: string; ownerId: string };
  let gymB: { tenantId: string; slug: string; ownerToken: string; ownerId: string };

  describe('POST /auth/register-business', () => {
    it('creates gym A: a new ONBOARDING tenant with default settings and an OWNER user', async () => {
      const response = await request(server())
        .post('/api/v1/auth/register-business')
        .send({
          businessName: `${MARKER} Gym A`,
          ownerEmail: `${MARKER}-owner-a@example.com`,
          ownerPassword: 'Password123!',
          ownerFirstName: 'Alex',
          ownerLastName: 'OwnerA',
        })
        .expect(201);

      expect(response.body.data.user.role).toBe('OWNER');
      expect(response.body.data.accessToken).toEqual(expect.any(String));

      const tenantId = response.body.data.user.tenantId as string;
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      expect(tenant.status).toBe('ONBOARDING');
      expect(tenant.name).toBe(`${MARKER} Gym A`);

      const settings = await prisma.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
      expect(settings.paymentMethods).toMatchObject({ card: true });

      gymA = { tenantId, slug: tenant.slug, ownerToken: response.body.data.accessToken, ownerId: response.body.data.user.id };
    });

    it('creates gym B: a second, entirely independent tenant', async () => {
      const response = await request(server())
        .post('/api/v1/auth/register-business')
        .send({
          businessName: `${MARKER} Gym B`,
          ownerEmail: `${MARKER}-owner-b@example.com`,
          ownerPassword: 'Password123!',
          ownerFirstName: 'Blair',
          ownerLastName: 'OwnerB',
        })
        .expect(201);

      const tenantId = response.body.data.user.tenantId as string;
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      expect(tenantId).not.toBe(gymA.tenantId);

      gymB = { tenantId, slug: tenant.slug, ownerToken: response.body.data.accessToken, ownerId: response.body.data.user.id };
    });

    it('rejects a second gym registered with an already-used owner email', async () => {
      const response = await request(server())
        .post('/api/v1/auth/register-business')
        .send({
          businessName: `${MARKER} Gym C`,
          ownerEmail: `${MARKER}-owner-a@example.com`, // already gym A's owner
          ownerPassword: 'Password123!',
          ownerFirstName: 'Casey',
          ownerLastName: 'OwnerC',
        })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('GET/PATCH /tenants/me — the current gym', () => {
    it("returns the caller's own gym, not any other", async () => {
      const responseA = await request(server()).get('/api/v1/tenants/me').set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      const responseB = await request(server()).get('/api/v1/tenants/me').set('Authorization', `Bearer ${gymB.ownerToken}`).expect(200);

      expect(responseA.body.data.id).toBe(gymA.tenantId);
      expect(responseB.body.data.id).toBe(gymB.tenantId);
      expect(responseA.body.data.id).not.toBe(responseB.body.data.id);
      expect(responseA.body.data.name).toBe(`${MARKER} Gym A`);
    });

    it('updating the profile applies the given fields and auto-completes onboarding (ONBOARDING -> ACTIVE)', async () => {
      const response = await request(server())
        .patch('/api/v1/tenants/me')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ tagline: 'Strength, built together.', city: 'Manchester', currency: 'GBP' })
        .expect(200);

      expect(response.body.data.tagline).toBe('Strength, built together.');
      expect(response.body.data.city).toBe('Manchester');
      expect(response.body.data.status).toBe('ACTIVE');
    });

    it("updating gym A's profile never touches gym B's", async () => {
      const before = await prisma.tenant.findUniqueOrThrow({ where: { id: gymB.tenantId } });

      await request(server())
        .patch('/api/v1/tenants/me')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: 'Renamed via Gym A owner' })
        .expect(200);

      const after = await prisma.tenant.findUniqueOrThrow({ where: { id: gymB.tenantId } });
      expect(after.name).toBe(before.name);
      expect(after.updatedAt).toEqual(before.updatedAt);
    });

    it('a MEMBER cannot update the gym profile (needs settings:MANAGE)', async () => {
      const member = await createActiveUser(gymA.tenantId, 'MEMBER', `${MARKER}-member-a@example.com`);
      const token = mintAccessToken(member);

      await request(server())
        .patch('/api/v1/tenants/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Should not apply' })
        .expect(403);
    });
  });

  describe('GET/PATCH /tenants/me/settings', () => {
    it('returns the default-seeded settings from gym creation', async () => {
      const response = await request(server())
        .get('/api/v1/tenants/me/settings')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(200);

      expect(response.body.data.paymentMethods).toMatchObject({ card: true, cash: true, bankTransfer: false });
      expect(Array.isArray(response.body.data.businessHours)).toBe(true);
      expect(response.body.data.businessHours.length).toBeGreaterThan(0);
    });

    it('updates only the section provided, leaving the others as they were', async () => {
      const before = await request(server())
        .get('/api/v1/tenants/me/settings')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(200);

      const response = await request(server())
        .patch('/api/v1/tenants/me/settings')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ paymentMethods: { card: false, upi: true, cash: false, bankTransfer: true } })
        .expect(200);

      expect(response.body.data.paymentMethods).toEqual({ card: false, upi: true, cash: false, bankTransfer: true });
      expect(response.body.data.membershipPolicy).toEqual(before.body.data.membershipPolicy);
      expect(response.body.data.businessHours).toEqual(before.body.data.businessHours);
    });

    it('rejects a malformed settings payload', async () => {
      const response = await request(server())
        .patch('/api/v1/tenants/me/settings')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ paymentMethods: { card: 'yes-please' } }) // wrong type, missing fields
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('a MANAGER can view settings (staff default: settings:VIEW) but not change them', async () => {
      const manager = await createActiveUser(gymA.tenantId, 'MANAGER', `${MARKER}-manager-a@example.com`);
      const token = mintAccessToken(manager);

      await request(server()).get('/api/v1/tenants/me/settings').set('Authorization', `Bearer ${token}`).expect(200);
      await request(server())
        .patch('/api/v1/tenants/me/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ paymentMethods: { card: true, upi: true, cash: true, bankTransfer: true } })
        .expect(403);
    });
  });

  describe('Cross-tenant isolation', () => {
    it("gym B's owner cannot reach gym A's user records by id", async () => {
      await request(server())
        .get(`/api/v1/users/${gymA.ownerId}`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(404);
    });

    it("gym A's staff directory never includes gym B's owner", async () => {
      const response = await request(server())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);

      const ids = (response.body.data as { id: string }[]).map((u) => u.id);
      expect(ids).not.toContain(gymB.ownerId);
    });
  });

  describe('Business status & lifecycle', () => {
    it('an OWNER can pause (INACTIVE) their own gym, and it stays reachable to reverse', async () => {
      const response = await request(server())
        .patch('/api/v1/tenants/me/status')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(response.body.data.status).toBe('INACTIVE');
    });

    it('a paused gym blocks ordinary API access — even for its own owner — except the exempted routes', async () => {
      await request(server())
        .get('/api/v1/tenants/me/settings')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(403);

      // Exempted: seeing the gym's own (paused) status, and reversing it.
      const current = await request(server())
        .get('/api/v1/tenants/me')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(200);
      expect(current.body.data.status).toBe('INACTIVE');
    });

    it('a paused gym blocks a regular member too, not just non-exempted owner routes', async () => {
      const registerResponse = await request(server())
        .post('/api/v1/auth/register')
        .send({
          email: `${MARKER}-member-b@example.com`,
          password: 'Password123!',
          firstName: 'Morgan',
          lastName: 'MemberB',
          tenantSlug: gymB.slug,
        });
      // Gym B is currently INACTIVE — even joining it is refused.
      expect(registerResponse.status).toBe(403);
    });

    it('login itself is refused for a paused gym, even with the correct password', async () => {
      // Create the member directly (bypassing the paused-gym registration
      // block above) so there is an account to attempt logging into.
      await createActiveUser(gymB.tenantId, 'MEMBER', `${MARKER}-member-b@example.com`);

      const response = await request(server())
        .post('/api/v1/auth/login')
        .send({ email: `${MARKER}-member-b@example.com`, password: 'Password123!' });

      expect(response.status).toBe(403);
    });

    it('reactivating the gym restores access', async () => {
      await request(server())
        .patch('/api/v1/tenants/me/status')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      const response = await request(server())
        .post('/api/v1/auth/login')
        .send({ email: `${MARKER}-member-b@example.com`, password: 'Password123!' })
        .expect(201);

      expect(response.body.data.user.email).toBe(`${MARKER}-member-b@example.com`);
    });

    it('a MEMBER cannot pause or reactivate the gym (owner-only action)', async () => {
      const member = await createActiveUser(gymA.tenantId, 'MEMBER', `${MARKER}-member-a2@example.com`);
      const token = mintAccessToken(member);

      await request(server())
        .patch('/api/v1/tenants/me/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' })
        .expect(403);
    });

    it('a platform-level suspension cannot be self-lifted, but the gym stays visible to its owner', async () => {
      await prisma.tenant.update({ where: { id: gymB.tenantId }, data: { status: 'SUSPENDED' } });

      const attempt = await request(server())
        .patch('/api/v1/tenants/me/status')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ status: 'ACTIVE' })
        .expect(403);
      expect(attempt.body.error.message.toLowerCase()).toContain('suspend');

      const current = await request(server())
        .get('/api/v1/tenants/me')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(200);
      expect(current.body.data.status).toBe('SUSPENDED');

      // Restore to ACTIVE directly for test hygiene (nothing else in this
      // file depends on gym B staying suspended).
      await prisma.tenant.update({ where: { id: gymB.tenantId }, data: { status: 'ACTIVE' } });
    });
  });
});
