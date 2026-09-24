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
 * Membership Plans, Member Memberships, Lifecycle & Renewals — always
 * against TWO independent gyms, mirroring every other e2e suite's own
 * pattern. Sessions are minted directly via JwtService; only the two
 * /auth/register-business calls hit an HTTP auth endpoint.
 */
describe('Membership Plans + Memberships (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;

  const MARKER = 'e2e-mem-test';
  const KNOWN_PASSWORD = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    passwordService = app.get(PasswordService);

    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.memberMembership.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.membershipPlan.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.member.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.user.deleteMany({ where: { email: { contains: MARKER } } });
    await prisma.tenant.deleteMany({ where: { slug: { contains: MARKER } } });
  }

  function server() {
    return app.getHttpServer();
  }

  function mintAccessToken(user: Pick<User, 'id' | 'tenantId' | 'email' | 'role'>): string {
    return jwtService.sign({ sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role });
  }

  async function createStaffUser(tenantId: string, role: 'MANAGER' | 'TRAINER' | 'FRONT_DESK', email: string): Promise<User> {
    const passwordHash = await passwordService.hash(KNOWN_PASSWORD);
    return prisma.user.create({
      data: { tenantId, email, passwordHash, firstName: 'Test', lastName: role, role, status: 'ACTIVE' },
    });
  }

  async function createMemberWithLogin(
    tenantId: string,
    email: string,
    status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
  ): Promise<{ user: User; memberId: string; token: string }> {
    const user = await createStaffUser(tenantId, 'FRONT_DESK', email);
    await prisma.user.update({ where: { id: user.id }, data: { role: 'MEMBER' } });
    const member = await prisma.member.create({
      data: { tenantId, userId: user.id, firstName: 'Test', lastName: 'Member', email, status },
    });
    return { user: { ...user, role: 'MEMBER' } as User, memberId: member.id, token: mintAccessToken({ ...user, role: 'MEMBER' as never }) };
  }

  let gymA: { tenantId: string; slug: string; ownerToken: string };
  let gymB: { tenantId: string; slug: string; ownerToken: string };
  let managerAToken: string;
  let trainerAToken: string;
  let frontDeskAToken: string;
  let memberA: { user: User; memberId: string; token: string };
  let memberA2: { user: User; memberId: string; token: string };

  beforeAll(async () => {
    const resA = await request(server())
      .post('/api/v1/auth/register-business')
      .send({
        businessName: `${MARKER} Gym A`,
        ownerEmail: `${MARKER}-owner-a@example.com`,
        ownerPassword: KNOWN_PASSWORD,
        ownerFirstName: 'Alex',
        ownerLastName: 'OwnerA',
      });
    const tenantIdA = resA.body.data.user.tenantId as string;
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantIdA } });
    gymA = { tenantId: tenantIdA, slug: tenantA.slug, ownerToken: resA.body.data.accessToken };

    const resB = await request(server())
      .post('/api/v1/auth/register-business')
      .send({
        businessName: `${MARKER} Gym B`,
        ownerEmail: `${MARKER}-owner-b@example.com`,
        ownerPassword: KNOWN_PASSWORD,
        ownerFirstName: 'Blair',
        ownerLastName: 'OwnerB',
      });
    const tenantIdB = resB.body.data.user.tenantId as string;
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantIdB } });
    gymB = { tenantId: tenantIdB, slug: tenantB.slug, ownerToken: resB.body.data.accessToken };

    const managerA = await createStaffUser(gymA.tenantId, 'MANAGER', `${MARKER}-manager-a@example.com`);
    managerAToken = mintAccessToken(managerA);
    const trainerA = await createStaffUser(gymA.tenantId, 'TRAINER', `${MARKER}-trainer-a@example.com`);
    trainerAToken = mintAccessToken(trainerA);
    const frontDeskA = await createStaffUser(gymA.tenantId, 'FRONT_DESK', `${MARKER}-frontdesk-a@example.com`);
    frontDeskAToken = mintAccessToken(frontDeskA);

    memberA = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a1@example.com`);
    memberA2 = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a2@example.com`);
  });

  // -------------------------------------------------------------------
  // Membership Plans
  // -------------------------------------------------------------------
  let basicPlanId: string;
  let elitePlanId: string;

  describe('Membership plans', () => {
    it('a MEMBER cannot create a plan', async () => {
      await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ name: 'Should Fail', price: 10, billingPeriod: 'MONTHLY' })
        .expect(403);
    });

    it('creates a plan', async () => {
      const response = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: `${MARKER} Basic`, price: 39, billingPeriod: 'MONTHLY', perks: ['Gym floor access'] })
        .expect(201);
      expect(response.body.data.price).toBe(39);
      basicPlanId = response.body.data.id;
    });

    it('rejects a duplicate plan name in the same gym', async () => {
      const response = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: `${MARKER} Basic`, price: 20, billingPeriod: 'MONTHLY' })
        .expect(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('creates a second (yearly) plan', async () => {
      const response = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: `${MARKER} Elite`, price: 1000, billingPeriod: 'YEARLY', isPopular: true })
        .expect(201);
      elitePlanId = response.body.data.id;
    });

    it('updates plan pricing', async () => {
      const response = await request(server())
        .patch(`/api/v1/membership-plans/${basicPlanId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ price: 45 })
        .expect(200);
      expect(response.body.data.price).toBe(45);
    });

    it('archives a plan, and a member no longer sees it browsing', async () => {
      const throwawayPlan = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: `${MARKER} Throwaway`, price: 5, billingPeriod: 'MONTHLY' })
        .expect(201);

      await request(server())
        .post(`/api/v1/membership-plans/${throwawayPlan.body.data.id}/archive`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);

      const memberView = await request(server())
        .get('/api/v1/membership-plans')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      const ids = (memberView.body.data as { id: string }[]).map((p) => p.id);
      expect(ids).not.toContain(throwawayPlan.body.data.id);

      const ownerView = await request(server())
        .get('/api/v1/membership-plans')
        .query({ limit: 100, status: 'ARCHIVED' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect((ownerView.body.data as { id: string }[]).map((p) => p.id)).toContain(throwawayPlan.body.data.id);
    });

    it('rejects archiving an already-archived plan', async () => {
      const p = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: `${MARKER} DoubleArchive`, price: 5, billingPeriod: 'MONTHLY' })
        .expect(201);
      await request(server()).post(`/api/v1/membership-plans/${p.body.data.id}/archive`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(201);
      const response = await request(server())
        .post(`/api/v1/membership-plans/${p.body.data.id}/archive`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------
  // Membership creation, overlap prevention, lifecycle
  // -------------------------------------------------------------------
  let memberAMembershipId: string;

  describe('Membership creation and rules', () => {
    it('staff assigns a membership to a member', async () => {
      const response = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, planId: basicPlanId })
        .expect(201);
      expect(response.body.data.effectiveStatus).toBe('ACTIVE');
      expect(response.body.data.planName).toBe(`${MARKER} Basic`);
      expect(response.body.data.price).toBe(45);
      memberAMembershipId = response.body.data.id;
    });

    it('rejects assigning a second overlapping membership to the same member', async () => {
      const response = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, planId: elitePlanId })
        .expect(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('rejects assigning a membership on an archived plan', async () => {
      const archived = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: `${MARKER} ArchivedForCreate`, price: 5, billingPeriod: 'MONTHLY' })
        .expect(201);
      await request(server()).post(`/api/v1/membership-plans/${archived.body.data.id}/archive`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(201);

      const response = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA2.memberId, planId: archived.body.data.id })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('supports a future-dated start (scheduled membership) and computes PENDING as the effective status', async () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 30);
      const response = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA2.memberId, planId: basicPlanId, startDate: future.toISOString().slice(0, 10) })
        .expect(201);
      expect(response.body.data.effectiveStatus).toBe('PENDING');
    });

    it("a member's own current membership is visible via GET /memberships/me", async () => {
      const response = await request(server()).get('/api/v1/memberships/me').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(response.body.data.id).toBe(memberAMembershipId);
    });

    it('a member with no membership gets null from GET /memberships/me', async () => {
      const freshMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-no-membership@example.com`);
      const response = await request(server()).get('/api/v1/memberships/me').set('Authorization', `Bearer ${freshMember.token}`).expect(200);
      expect(response.body.data).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // Renewals — self-service purchase/renew, staff renew, plan switching
  // -------------------------------------------------------------------
  describe('Renewals', () => {
    it('member self-service purchase for someone with no membership creates a fresh one', async () => {
      const freshMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-self-purchase@example.com`);
      const response = await request(server())
        .post('/api/v1/memberships/me')
        .set('Authorization', `Bearer ${freshMember.token}`)
        .send({ planId: basicPlanId })
        .expect(201);
      expect(response.body.data.renewedFromId).toBeNull();
      expect(response.body.data.effectiveStatus).toBe('ACTIVE');
    });

    it("member self-service purchase when already active renews (stacks onto the current period's end)", async () => {
      const before = await request(server()).get('/api/v1/memberships/me').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      const oldEndDate = before.body.data.endDate as string;

      const response = await request(server())
        .post('/api/v1/memberships/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ planId: basicPlanId })
        .expect(201);

      expect(response.body.data.renewedFromId).toBe(memberAMembershipId);
      const expectedStart = new Date(oldEndDate);
      expectedStart.setUTCDate(expectedStart.getUTCDate() + 1);
      expect(response.body.data.startDate.slice(0, 10)).toBe(expectedStart.toISOString().slice(0, 10));
    });

    it('member self-service purchase can switch plans mid-renewal', async () => {
      const response = await request(server())
        .post('/api/v1/memberships/me')
        .set('Authorization', `Bearer ${memberA2.token}`)
        .send({ planId: elitePlanId })
        .expect(201);
      // memberA2 previously had a PENDING Basic membership — switching plans renews it instead of erroring.
      expect(response.body.data.planName).toBe(`${MARKER} Elite`);
      expect(response.body.data.billingPeriod).toBe('YEARLY');
    });

    it("the member's full history shows both periods, chained by renewedFromId", async () => {
      const response = await request(server())
        .get('/api/v1/memberships/me/history')
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      const latest = (response.body.data as { id: string; renewedFromId: string | null }[]).find((m) => m.renewedFromId === memberAMembershipId);
      expect(latest).toBeDefined();
    });

    it('staff can renew a specific membership by id, switching plans', async () => {
      const staffMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-staff-renew@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: staffMember.memberId, planId: basicPlanId })
        .expect(201);

      const renewed = await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/renew`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ planId: elitePlanId })
        .expect(201);
      expect(renewed.body.data.planName).toBe(`${MARKER} Elite`);
      expect(renewed.body.data.renewedFromId).toBe(created.body.data.id);
    });

    it('rejects renewing the same period twice (renew the latest one instead)', async () => {
      const staffMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-double-renew@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: staffMember.memberId, planId: basicPlanId })
        .expect(201);
      await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/renew`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(201);

      const response = await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/renew`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  // -------------------------------------------------------------------
  // Freeze / unfreeze / cancel
  // -------------------------------------------------------------------
  describe('Freeze, unfreeze, and cancel', () => {
    it('freezes an active membership, blocking a second freeze', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-freeze@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: m.memberId, planId: basicPlanId })
        .expect(201);

      const frozen = await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/freeze`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(frozen.body.data.effectiveStatus).toBe('FROZEN');

      await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/freeze`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(400);
    });

    it('unfreezing extends the endDate and restores ACTIVE status', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-unfreeze@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: m.memberId, planId: basicPlanId })
        .expect(201);
      const originalEnd = created.body.data.endDate as string;

      await request(server()).post(`/api/v1/memberships/${created.body.data.id}/freeze`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(201);
      const unfrozen = await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/unfreeze`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);

      expect(unfrozen.body.data.status).toBe('ACTIVE');
      expect(new Date(unfrozen.body.data.endDate).getTime()).toBeGreaterThanOrEqual(new Date(originalEnd).getTime());
    });

    it('rejects unfreezing a membership that is not frozen', async () => {
      await request(server()).post(`/api/v1/memberships/${memberAMembershipId}/unfreeze`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(400);
    });

    it('cancels a membership immediately, blocking check-in-equivalent access regardless of remaining dates', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-cancel@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: m.memberId, planId: basicPlanId })
        .expect(201);

      const cancelled = await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ reason: 'Requested at front desk' })
        .expect(201);
      expect(cancelled.body.data.effectiveStatus).toBe('CANCELLED');
      expect(cancelled.body.data.cancellationReason).toBe('Requested at front desk');

      await request(server()).post(`/api/v1/memberships/${created.body.data.id}/cancel`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(400);
    });
  });

  // -------------------------------------------------------------------
  // Search, filtering, pagination, stats
  // -------------------------------------------------------------------
  describe('Search, filtering, and stats', () => {
    it('filters memberships by effectiveStatus=ACTIVE', async () => {
      const response = await request(server())
        .get('/api/v1/memberships')
        .query({ effectiveStatus: 'ACTIVE', limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      for (const row of response.body.data as { effectiveStatus: string }[]) {
        expect(row.effectiveStatus).toBe('ACTIVE');
      }
    });

    it('filters memberships by effectiveStatus=PENDING', async () => {
      const response = await request(server())
        .get('/api/v1/memberships')
        .query({ effectiveStatus: 'PENDING', limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      for (const row of response.body.data as { effectiveStatus: string }[]) {
        expect(row.effectiveStatus).toBe('PENDING');
      }
    });

    it('searches memberships by member name', async () => {
      const response = await request(server())
        .get('/api/v1/memberships')
        .query({ search: memberA.user.firstName })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('paginates results', async () => {
      const response = await request(server())
        .get('/api/v1/memberships')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.totalItems).toBeGreaterThan(1);
    });

    it('returns membership stats', async () => {
      const response = await request(server()).get('/api/v1/memberships/stats').set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(response.body.data).toEqual(
        expect.objectContaining({ active: expect.any(Number), pending: expect.any(Number), frozen: expect.any(Number), cancelled: expect.any(Number) }),
      );
    });

    it("staff can view a specific member's current membership and history", async () => {
      const current = await request(server())
        .get(`/api/v1/memberships/member/${memberA.memberId}/current`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(current.body.data).not.toBeNull();

      const history = await request(server())
        .get(`/api/v1/memberships/member/${memberA.memberId}/history`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(history.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------
  // Cross-tenant isolation
  // -------------------------------------------------------------------
  describe('Cross-tenant isolation', () => {
    it("gym B's owner cannot read gym A's plan by id", async () => {
      await request(server()).get(`/api/v1/membership-plans/${basicPlanId}`).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(404);
    });

    it("gym B's owner cannot read gym A's membership by id", async () => {
      await request(server()).get(`/api/v1/memberships/${memberAMembershipId}`).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(404);
    });

    it("gym B's owner cannot renew/freeze/cancel gym A's membership", async () => {
      await request(server()).post(`/api/v1/memberships/${memberAMembershipId}/freeze`).set('Authorization', `Bearer ${gymB.ownerToken}`).send({}).expect(404);
      await request(server()).post(`/api/v1/memberships/${memberAMembershipId}/cancel`).set('Authorization', `Bearer ${gymB.ownerToken}`).send({}).expect(404);
    });

    it("gym A's membership list never includes gym B's memberships", async () => {
      const gymBMember = await createMemberWithLogin(gymB.tenantId, `${MARKER}-gymb-member@example.com`);
      const gymBPlan = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ name: `${MARKER} GymB Plan`, price: 10, billingPeriod: 'MONTHLY' })
        .expect(201);
      const gymBMembership = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ memberId: gymBMember.memberId, planId: gymBPlan.body.data.id })
        .expect(201);

      const response = await request(server())
        .get('/api/v1/memberships')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      const ids = (response.body.data as { id: string }[]).map((m) => m.id);
      expect(ids).not.toContain(gymBMembership.body.data.id);
    });
  });

  // -------------------------------------------------------------------
  // Role authorization
  // -------------------------------------------------------------------
  describe('Role authorization', () => {
    it('FRONT_DESK (memberships:view by default) can view but not manage', async () => {
      await request(server()).get('/api/v1/memberships').set('Authorization', `Bearer ${frontDeskAToken}`).expect(200);
      await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${frontDeskAToken}`)
        .send({ memberId: memberA.memberId, planId: basicPlanId })
        .expect(403);
    });

    it('TRAINER (memberships:none by default) cannot view or manage memberships', async () => {
      await request(server()).get('/api/v1/memberships').set('Authorization', `Bearer ${trainerAToken}`).expect(403);
    });

    it('a MANAGER (memberships:manage by default) can create and renew memberships', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-manager-created@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ memberId: m.memberId, planId: basicPlanId })
        .expect(201);
      await request(server())
        .post(`/api/v1/memberships/${created.body.data.id}/renew`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({})
        .expect(201);
    });
  });
});
