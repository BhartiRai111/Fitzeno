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
import { TokenService } from '../src/auth/token.service.js';
import type { User } from '../src/generated/prisma/client.js';

/**
 * Exercises the real HTTP surface of the auth/users/authz vertical slice
 * against the dev database. Routes that carry their own per-IP throttle
 * (register: 3/min, login: 5/min, forgot-password: 3/min) are each called
 * exactly at (never over) their budget in this file, since every request
 * here shares one ThrottlerGuard window. Authorization/permission checks
 * mint JWTs directly via JwtService for hand-built test users instead of
 * spending login-throttle budget on them.
 */
describe('Auth + Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let tenantId: string;

  const TEST_EMAIL_MARKER = 'e2e-auth-test';
  const TEST_TENANT_SLUG = 'e2e-auth-test-tenant';
  const KNOWN_PASSWORD = 'Password123!';

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
    tokenService = app.get(TokenService);

    // Clean slate in case a previous run was interrupted before its own cleanup ran.
    await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_MARKER } } });
    await prisma.tenant.deleteMany({ where: { slug: TEST_TENANT_SLUG } });

    const tenant = await prisma.tenant.create({
      data: { name: 'E2E Auth Test Gym', slug: TEST_TENANT_SLUG },
    });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_MARKER } } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  function server() {
    return app.getHttpServer();
  }

  function mintAccessToken(user: Pick<User, 'id' | 'tenantId' | 'email' | 'role'>): string {
    return jwtService.sign({ sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role });
  }

  interface CreateUserOptions {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: User['role'];
    status?: User['status'];
  }

  async function createUser(options: CreateUserOptions): Promise<User> {
    const passwordHash = await passwordService.hash(options.password ?? KNOWN_PASSWORD);
    return prisma.user.create({
      data: {
        tenantId,
        email: options.email,
        passwordHash,
        firstName: options.firstName ?? 'Test',
        lastName: options.lastName ?? 'User',
        role: options.role ?? 'MEMBER',
        status: options.status ?? 'ACTIVE',
      },
    });
  }

  function extractCookie(response: request.Response, name: string): string {
    const setCookie = response.headers['set-cookie'] as unknown as string[] | undefined;
    const raw = setCookie?.find((c) => c.startsWith(`${name}=`));
    if (!raw) throw new Error(`Expected a ${name} cookie in the response`);
    return raw.split(';')[0]!;
  }

  // ---------------------------------------------------------------------
  // Registration — uses all 3 of this window's /auth/register calls.
  // ---------------------------------------------------------------------
  describe('POST /auth/register', () => {
    const email = `${TEST_EMAIL_MARKER}-register@example.com`;

    it('creates a MEMBER account and issues a session', async () => {
      const response = await request(server())
        .post('/api/v1/auth/register')
        .send({ email, password: KNOWN_PASSWORD, firstName: 'New', lastName: 'Member', tenantSlug: TEST_TENANT_SLUG })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({ email, role: 'MEMBER', status: 'ACTIVE' });
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.accessToken).toEqual(expect.any(String));
      expect(extractCookie(response, 'refresh_token')).toContain('refresh_token=');
    });

    it('rejects a duplicate email with 409 Conflict', async () => {
      const response = await request(server())
        .post('/api/v1/auth/register')
        .send({ email, password: KNOWN_PASSWORD, firstName: 'New', lastName: 'Member', tenantSlug: TEST_TENANT_SLUG })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('rejects a password shorter than the minimum with 400 and validation details', async () => {
      const response = await request(server())
        .post('/api/v1/auth/register')
        .send({
          email: `${TEST_EMAIL_MARKER}-short@example.com`,
          password: 'short',
          firstName: 'A',
          lastName: 'B',
          tenantSlug: TEST_TENANT_SLUG,
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some((d: string) => d.toLowerCase().includes('password'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Login — uses all 5 of this window's /auth/login calls. The successful
  // one's session is reused below for /auth/me, refresh, logout and
  // change-password so those don't need their own login calls.
  // ---------------------------------------------------------------------
  describe('POST /auth/login', () => {
    let activeUser: User;
    let invitedUser: User;
    let inactiveUser: User;
    let activeSession: { accessToken: string; refreshCookie: string };

    beforeAll(async () => {
      activeUser = await createUser({ email: `${TEST_EMAIL_MARKER}-login-active@example.com`, status: 'ACTIVE' });
      invitedUser = await createUser({ email: `${TEST_EMAIL_MARKER}-login-invited@example.com`, status: 'INVITED' });
      inactiveUser = await createUser({
        email: `${TEST_EMAIL_MARKER}-login-inactive@example.com`,
        status: 'INACTIVE',
      });
    });

    it('logs in with correct credentials', async () => {
      const response = await request(server())
        .post('/api/v1/auth/login')
        .send({ email: activeUser.email, password: KNOWN_PASSWORD })
        .expect(201);

      expect(response.body.data.user.email).toBe(activeUser.email);
      activeSession = {
        accessToken: response.body.data.accessToken,
        refreshCookie: extractCookie(response, 'refresh_token'),
      };
    });

    it('rejects the wrong password with a generic message', async () => {
      const response = await request(server())
        .post('/api/v1/auth/login')
        .send({ email: activeUser.email, password: 'WrongPassword!' })
        .expect(401);

      expect(response.body.error.message).toBe('Invalid email or password.');
    });

    it('rejects an unknown email with the identical generic message (anti-enumeration)', async () => {
      const response = await request(server())
        .post('/api/v1/auth/login')
        .send({ email: `${TEST_EMAIL_MARKER}-nobody@example.com`, password: 'WrongPassword!' })
        .expect(401);

      expect(response.body.error.message).toBe('Invalid email or password.');
    });

    it('rejects an INVITED account before checking the password, with an actionable message', async () => {
      const response = await request(server())
        .post('/api/v1/auth/login')
        .send({ email: invitedUser.email, password: 'anything-at-all' })
        .expect(403);

      expect(response.body.error.message.toLowerCase()).toContain('setup');
    });

    it('rejects an INACTIVE account only after the correct password is supplied', async () => {
      const response = await request(server())
        .post('/api/v1/auth/login')
        .send({ email: inactiveUser.email, password: KNOWN_PASSWORD })
        .expect(403);

      expect(response.body.error.message.toLowerCase()).toContain('inactive');
    });

    describe('using the session from the successful login', () => {
      it('GET /auth/me returns the authenticated user with a bearer token', async () => {
        const response = await request(server())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${activeSession.accessToken}`)
          .expect(200);

        expect(response.body.data.email).toBe(activeUser.email);
      });

      it('GET /auth/me without a token is rejected', async () => {
        await request(server()).get('/api/v1/auth/me').expect(401);
      });

      it('POST /auth/refresh rotates the refresh token and issues a new access token', async () => {
        const oldCookie = activeSession.refreshCookie;
        const response = await request(server())
          .post('/api/v1/auth/refresh')
          .set('Cookie', oldCookie)
          .expect(201);

        expect(response.body.data.accessToken).toEqual(expect.any(String));
        const newCookie = extractCookie(response, 'refresh_token');
        expect(newCookie).not.toBe(oldCookie);

        // Reusing the now-rotated-out cookie is treated as possible token theft.
        await request(server()).post('/api/v1/auth/refresh').set('Cookie', oldCookie).expect(401);

        activeSession.refreshCookie = newCookie;
      });

      it('POST /auth/logout revokes the session; refreshing afterward is rejected', async () => {
        await request(server())
          .post('/api/v1/auth/logout')
          .set('Cookie', activeSession.refreshCookie)
          .expect(204);

        await request(server())
          .post('/api/v1/auth/refresh')
          .set('Cookie', activeSession.refreshCookie)
          .expect(401);
      });

      it('POST /auth/change-password rejects an incorrect current password', async () => {
        const response = await request(server())
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${activeSession.accessToken}`)
          .send({ currentPassword: 'WrongCurrent!', newPassword: 'NewPassword123!' })
          .expect(400);

        expect(response.body.error.message).toBe('Current password is incorrect.');
      });

      it('POST /auth/change-password succeeds and revokes all refresh tokens', async () => {
        await request(server())
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${activeSession.accessToken}`)
          .send({ currentPassword: KNOWN_PASSWORD, newPassword: 'NewPassword123!' })
          .expect(204);

        const updated = await prisma.user.findUniqueOrThrow({ where: { id: activeUser.id } });
        await expect(passwordService.compare('NewPassword123!', updated.passwordHash)).resolves.toBe(true);

        const liveTokens = await prisma.refreshToken.count({ where: { userId: activeUser.id, revokedAt: null } });
        expect(liveTokens).toBe(0);
      });
    });
  });

  // ---------------------------------------------------------------------
  // Forgot/reset password — forgot-password uses all 3 of its window's
  // calls; reset-password itself carries no route-specific throttle.
  // ---------------------------------------------------------------------
  describe('Password reset flow', () => {
    let resetUser: User;
    let inactiveUser: User;

    beforeAll(async () => {
      resetUser = await createUser({ email: `${TEST_EMAIL_MARKER}-reset@example.com`, status: 'ACTIVE' });
      inactiveUser = await createUser({ email: `${TEST_EMAIL_MARKER}-reset-inactive@example.com`, status: 'INACTIVE' });
    });

    it('POST /auth/forgot-password always returns an identical 204 — existing, unknown, and inactive emails alike', async () => {
      const existing = await request(server())
        .post('/api/v1/auth/forgot-password')
        .send({ email: resetUser.email })
        .expect(204);
      const unknown = await request(server())
        .post('/api/v1/auth/forgot-password')
        .send({ email: `${TEST_EMAIL_MARKER}-nobody-2@example.com` })
        .expect(204);
      const inactive = await request(server())
        .post('/api/v1/auth/forgot-password')
        .send({ email: inactiveUser.email })
        .expect(204);

      expect(existing.body).toEqual(unknown.body);
      expect(unknown.body).toEqual(inactive.body);
    });

    it('POST /auth/reset-password rejects an unknown token', async () => {
      await request(server())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'not-a-real-token', newPassword: 'BrandNewPassword123!' })
        .expect(400);
    });

    it('POST /auth/reset-password rejects an expired token', async () => {
      const rawToken = tokenService.generateOpaqueToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: resetUser.id,
          tokenHash: tokenService.hashToken(rawToken),
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      await request(server())
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'BrandNewPassword123!' })
        .expect(400);
    });

    it('POST /auth/reset-password succeeds with a valid token, and the token cannot be reused', async () => {
      const rawToken = tokenService.generateOpaqueToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: resetUser.id,
          tokenHash: tokenService.hashToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await request(server())
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'BrandNewPassword123!' })
        .expect(204);

      const updated = await prisma.user.findUniqueOrThrow({ where: { id: resetUser.id } });
      await expect(passwordService.compare('BrandNewPassword123!', updated.passwordHash)).resolves.toBe(true);

      await request(server())
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'AnotherPassword123!' })
        .expect(400);
    });

    it('an invited user completing reset-password transitions from INVITED to ACTIVE', async () => {
      const invitee = await createUser({
        email: `${TEST_EMAIL_MARKER}-invitee-completes@example.com`,
        status: 'INVITED',
      });
      const rawToken = tokenService.generateOpaqueToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: invitee.id,
          tokenHash: tokenService.hashToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await request(server())
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'SetupPassword123!' })
        .expect(204);

      const updated = await prisma.user.findUniqueOrThrow({ where: { id: invitee.id } });
      expect(updated.status).toBe('ACTIVE');
    });
  });

  // ---------------------------------------------------------------------
  // Authorization: roles, permissions, self-or-permission, tenant scoping.
  // Tokens are minted directly, spending no login-throttle budget.
  // ---------------------------------------------------------------------
  describe('Users directory authorization', () => {
    let owner: User;
    let manager: User;
    let member: User;
    let otherTenantMember: User;

    beforeAll(async () => {
      owner = await createUser({ email: `${TEST_EMAIL_MARKER}-authz-owner@example.com`, role: 'OWNER' });
      manager = await createUser({ email: `${TEST_EMAIL_MARKER}-authz-manager@example.com`, role: 'MANAGER' });
      member = await createUser({ email: `${TEST_EMAIL_MARKER}-authz-member@example.com`, role: 'MEMBER' });

      const otherTenant = await prisma.tenant.create({
        data: { name: 'E2E Auth Test Gym (other)', slug: `${TEST_TENANT_SLUG}-other` },
      });
      const otherHash = await passwordService.hash(KNOWN_PASSWORD);
      otherTenantMember = await prisma.user.create({
        data: {
          tenantId: otherTenant.id,
          email: `${TEST_EMAIL_MARKER}-authz-other-tenant@example.com`,
          passwordHash: otherHash,
          firstName: 'Other',
          lastName: 'Tenant',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: otherTenantMember.id } });
      await prisma.tenant.delete({ where: { id: otherTenantMember.tenantId } });
    });

    it('a MEMBER with no STAFF permission is forbidden from listing the users directory', async () => {
      const token = mintAccessToken(member);
      await request(server()).get('/api/v1/users').set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('a MANAGER (staff:VIEW by default) can list the users directory but not invite staff (staff:MANAGE)', async () => {
      const token = mintAccessToken(manager);
      await request(server()).get('/api/v1/users').set('Authorization', `Bearer ${token}`).expect(200);

      await request(server())
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: `${TEST_EMAIL_MARKER}-should-not-be-created@example.com`, firstName: 'X', lastName: 'Y', role: 'TRAINER' })
        .expect(403);
    });

    it('an OWNER (staff:MANAGE by default) can invite a new TRAINER', async () => {
      const token = mintAccessToken(owner);
      const response = await request(server())
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: `${TEST_EMAIL_MARKER}-invited-trainer@example.com`, firstName: 'Tina', lastName: 'Trainer', role: 'TRAINER' })
        .expect(201);

      expect(response.body.data.status).toBe('INVITED');
      expect(response.body.data.role).toBe('TRAINER');
    });

    it('rejects inviting a MEMBER — member accounts are self-registered, not invited', async () => {
      const token = mintAccessToken(owner);
      await request(server())
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: `${TEST_EMAIL_MARKER}-should-not-be-invited-member@example.com`, firstName: 'A', lastName: 'B', role: 'MEMBER' })
        .expect(403);
    });

    it('a user can always view and edit their own profile without any STAFF permission', async () => {
      const token = mintAccessToken(member);
      await request(server()).get(`/api/v1/users/${member.id}`).set('Authorization', `Bearer ${token}`).expect(200);
      await request(server())
        .patch(`/api/v1/users/${member.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+1-555-0199' })
        .expect(200);
    });

    it('a MEMBER cannot view another user\'s profile', async () => {
      const token = mintAccessToken(member);
      await request(server()).get(`/api/v1/users/${owner.id}`).set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('only an OWNER can change a role; a MANAGER is forbidden even with staff:MANAGE-level access elsewhere', async () => {
      const managerToken = mintAccessToken(manager);
      await request(server())
        .patch(`/api/v1/users/${member.id}/role`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: 'TRAINER' })
        .expect(403);

      const ownerToken = mintAccessToken(owner);
      await request(server())
        .patch(`/api/v1/users/${member.id}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'TRAINER' })
        .expect(200);
    });

    it('a gym must always keep at least one active OWNER', async () => {
      const ownerToken = mintAccessToken(owner);
      await request(server())
        .patch(`/api/v1/users/${owner.id}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'MANAGER' })
        .expect(400);
    });

    it('users are scoped to their own tenant — an owner cannot reach a user from another tenant', async () => {
      const ownerToken = mintAccessToken(owner);
      await request(server())
        .get(`/api/v1/users/${otherTenantMember.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('permission overrides take effect immediately: granting a MEMBER staff:VIEW lets them list the directory', async () => {
      const ownerToken = mintAccessToken(owner);
      await request(server())
        .put(`/api/v1/users/${member.id}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ overrides: [{ area: 'STAFF', level: 'VIEW' }] })
        .expect(200);

      const memberToken = mintAccessToken(member);
      const response = await request(server())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
