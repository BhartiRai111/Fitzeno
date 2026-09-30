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
 * Attendance & Check-in — general gym check-in/check-out, the QR
 * token foundation, class/PT attendance marking, and history/search/stats —
 * always against TWO independent gyms, mirroring every other e2e suite's
 * own pattern. Sessions are minted directly via JwtService; only the two
 * /auth/register-business calls hit an HTTP auth endpoint.
 */
describe('Attendance & Check-in (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;

  const MARKER = 'e2e-att-test';
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
    await prisma.checkInToken.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.checkIn.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.classBooking.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.classOccurrence.deleteMany({ where: { classSeries: { tenant: { slug: { contains: MARKER } } } } });
    await prisma.classSeries.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.trainer.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
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

  /** Gives a member an ACTIVE membership on `planId`, starting today — the eligibility baseline every "can check in" test needs. */
  async function giveActiveMembership(ownerToken: string, memberId: string, planId: string): Promise<string> {
    const response = await request(server())
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ memberId, planId })
      .expect(201);
    return response.body.data.id as string;
  }

  let gymA: { tenantId: string; slug: string; ownerToken: string };
  let gymB: { tenantId: string; slug: string; ownerToken: string };
  let managerAToken: string;
  let trainerA: User;
  let trainerAToken: string;
  let trainerA2: User;
  let trainerA2Token: string;
  let frontDeskAToken: string;
  let planAId: string;

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
    trainerA = await createStaffUser(gymA.tenantId, 'TRAINER', `${MARKER}-trainer-a@example.com`);
    trainerAToken = mintAccessToken(trainerA);
    trainerA2 = await createStaffUser(gymA.tenantId, 'TRAINER', `${MARKER}-trainer-a2@example.com`);
    trainerA2Token = mintAccessToken(trainerA2);
    const frontDeskA = await createStaffUser(gymA.tenantId, 'FRONT_DESK', `${MARKER}-frontdesk-a@example.com`);
    frontDeskAToken = mintAccessToken(frontDeskA);

    const plan = await request(server())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${gymA.ownerToken}`)
      .send({ name: `${MARKER} Basic`, price: 39, billingPeriod: 'MONTHLY' })
      .expect(201);
    planAId = plan.body.data.id;
  });

  // -------------------------------------------------------------------
  // Self check-in / check-out
  // -------------------------------------------------------------------
  describe('Self check-in and check-out', () => {
    it('checks in a member with an active membership', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-selfcheckin@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);

      const response = await request(server())
        .post('/api/v1/attendance/check-in/me')
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      expect(response.body.data.outcome).toBe('CHECKED_IN');
      expect(response.body.data.checkIn.method).toBe('QR');
      expect(response.body.data.checkIn.checkOutAt).toBeNull();
    });

    it('reports ALREADY_CHECKED_IN and does not create a second open visit', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-dupcheckin@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);

      const first = await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);
      expect(first.body.data.outcome).toBe('CHECKED_IN');

      const second = await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);
      expect(second.body.data.outcome).toBe('ALREADY_CHECKED_IN');
      expect(second.body.data.checkIn.id).toBe(first.body.data.checkIn.id);
    });

    it("reflects status via GET /attendance/status/me, then check-out closes it", async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-statuscheckin@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);

      await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);

      const status = await request(server()).get('/api/v1/attendance/status/me').set('Authorization', `Bearer ${member.token}`).expect(200);
      expect(status.body.data.checkedIn).toBe(true);

      const checkedOut = await request(server()).post('/api/v1/attendance/check-out/me').set('Authorization', `Bearer ${member.token}`).expect(201);
      expect(checkedOut.body.data.checkOutAt).not.toBeNull();

      const afterStatus = await request(server()).get('/api/v1/attendance/status/me').set('Authorization', `Bearer ${member.token}`).expect(200);
      expect(afterStatus.body.data.checkedIn).toBe(false);

      const history = await request(server()).get('/api/v1/attendance/history/me').set('Authorization', `Bearer ${member.token}`).expect(200);
      expect(history.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects checking out when there is no open visit', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-nocheckin@example.com`);
      const response = await request(server())
        .post('/api/v1/attendance/check-out/me')
        .set('Authorization', `Bearer ${member.token}`)
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------
  // Denial rules
  // -------------------------------------------------------------------
  describe('Check-in denial rules', () => {
    it('denies check-in for a member with no membership at all', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-nomembership@example.com`);
      const response = await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);
      expect(response.body.data.outcome).toBe('DENIED');
      expect(response.body.data.denialReason).toBe('NO_MEMBERSHIP');
    });

    it('denies check-in for a cancelled membership', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-cancelledmembership@example.com`);
      const membershipId = await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      await request(server()).post(`/api/v1/memberships/${membershipId}/cancel`).set('Authorization', `Bearer ${gymA.ownerToken}`).send({}).expect(201);

      const response = await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);
      expect(response.body.data.denialReason).toBe('MEMBERSHIP_CANCELLED');
    });

    it('denies check-in for a frozen membership', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-frozenmembership@example.com`);
      const membershipId = await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      await request(server()).post(`/api/v1/memberships/${membershipId}/freeze`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(201);

      const response = await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);
      expect(response.body.data.denialReason).toBe('MEMBERSHIP_FROZEN');
    });

    it('denies check-in for a member marked INACTIVE, without needing a membership check', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-inactivemember@example.com`, 'INACTIVE');
      const response = await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);
      expect(response.body.data.denialReason).toBe('MEMBER_INACTIVE');
    });
  });

  // -------------------------------------------------------------------
  // Front desk / staff-driven check-in
  // -------------------------------------------------------------------
  describe('Front-desk manual check-in and check-out', () => {
    it('front desk checks a member in manually, attributed to the staff user', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-manualcheckin@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      const frontDesk = await createStaffUser(gymA.tenantId, 'FRONT_DESK', `${MARKER}-fd-manual@example.com`);
      const frontDeskToken = mintAccessToken(frontDesk);

      const response = await request(server())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({ memberId: member.memberId })
        .expect(201);

      expect(response.body.data.outcome).toBe('CHECKED_IN');
      expect(response.body.data.checkIn.method).toBe('MANUAL');
      expect(response.body.data.checkIn.recordedByUserId).toBe(frontDesk.id);
    });

    it('staff can check out any open visit by its check-in id', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-staffcheckout@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      const created = await request(server())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: member.memberId })
        .expect(201);
      const checkInId = created.body.data.checkIn.id;

      const checkedOut = await request(server())
        .post(`/api/v1/attendance/${checkInId}/check-out`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(checkedOut.body.data.checkOutAt).not.toBeNull();

      await request(server()).post(`/api/v1/attendance/${checkInId}/check-out`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(400);
    });

    it("gym B's owner cannot check out gym A's check-in (cross-tenant 404)", async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-crosscheckout@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      const created = await request(server())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: member.memberId })
        .expect(201);

      await request(server())
        .post(`/api/v1/attendance/${created.body.data.checkIn.id}/check-out`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(404);
    });

    it("gym B's owner gets a 404 (not a leaked cross-gym check-in) manually checking in gym A's member", async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-crossmanual@example.com`);
      await request(server())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ memberId: member.memberId })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------
  // QR check-in token
  // -------------------------------------------------------------------
  describe('QR check-in token', () => {
    it('issues a token, redeems it once, and rejects redeeming it again', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-qrcheckin@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);

      const issued = await request(server())
        .get('/api/v1/attendance/check-in/token')
        .set('Authorization', `Bearer ${member.token}`)
        .expect(200);
      const token = issued.body.data.token as string;
      expect(token).toBeTruthy();

      const redeemed = await request(server())
        .post('/api/v1/attendance/check-in/redeem')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ token })
        .expect(201);
      expect(redeemed.body.data.outcome).toBe('CHECKED_IN');
      expect(redeemed.body.data.checkIn.method).toBe('QR');
      expect(redeemed.body.data.checkIn.recordedByUserId).not.toBeNull();

      const replay = await request(server())
        .post('/api/v1/attendance/check-in/redeem')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ token })
        .expect(400);
      expect(replay.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an expired token', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-qrexpired@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);

      const issued = await request(server())
        .get('/api/v1/attendance/check-in/token')
        .set('Authorization', `Bearer ${member.token}`)
        .expect(200);
      const token = issued.body.data.token as string;

      // Force expiry rather than waiting out the real TTL.
      await prisma.checkInToken.updateMany({ where: { memberId: member.memberId }, data: { expiresAt: new Date(Date.now() - 1000) } });

      const response = await request(server())
        .post('/api/v1/attendance/check-in/redeem')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ token })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an unrecognized token', async () => {
      await request(server())
        .post('/api/v1/attendance/check-in/redeem')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ token: 'not-a-real-token-not-a-real-token' })
        .expect(400);
    });

    it("gym B cannot redeem gym A's token (cross-tenant)", async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-qrcrosstenant@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);

      const issued = await request(server())
        .get('/api/v1/attendance/check-in/token')
        .set('Authorization', `Bearer ${member.token}`)
        .expect(200);

      await request(server())
        .post('/api/v1/attendance/check-in/redeem')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ token: issued.body.data.token })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------
  // History, today, stats, inactive members
  // -------------------------------------------------------------------
  describe('History, search, today, stats, inactive members', () => {
    it("today's summary includes a fresh check-in and counts it as currently in", async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-todaysummary@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);

      const today = await request(server()).get('/api/v1/attendance/today').set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(today.body.data.totalToday).toBeGreaterThan(0);
      expect(today.body.data.currentlyIn).toBeGreaterThan(0);
      expect((today.body.data.items as { member: { id: string } }[]).some((i) => i.member.id === member.memberId)).toBe(true);
    });

    it('filters attendance history by memberId', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-historyfilter@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${member.token}`).expect(201);

      const response = await request(server())
        .get('/api/v1/attendance')
        .query({ memberId: member.memberId })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      for (const row of response.body.data as { member: { id: string } }[]) {
        expect(row.member.id).toBe(member.memberId);
      }
    });

    it('returns day-bucketed stats over a date range', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const response = await request(server())
        .get('/api/v1/attendance/stats')
        .query({ from: today, to: today })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('reports an active member with no recent visit as inactive', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-inactiveinsight@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      // Never checks in.

      const response = await request(server())
        .get('/api/v1/attendance/inactive-members')
        .query({ days: 1 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      const ids = (response.body.data as { memberId: string }[]).map((m) => m.memberId);
      expect(ids).toContain(member.memberId);
    });

    it("gym A's attendance list never includes gym B's check-ins", async () => {
      const gymBPlan = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ name: `${MARKER} GymB Plan`, price: 10, billingPeriod: 'MONTHLY' })
        .expect(201);
      const gymBMember = await createMemberWithLogin(gymB.tenantId, `${MARKER}-gymbmember@example.com`);
      await giveActiveMembership(gymB.ownerToken, gymBMember.memberId, gymBPlan.body.data.id);
      await request(server()).post('/api/v1/attendance/check-in/me').set('Authorization', `Bearer ${gymBMember.token}`).expect(201);

      const response = await request(server())
        .get('/api/v1/attendance')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      const memberIds = (response.body.data as { member: { id: string } }[]).map((r) => r.member.id);
      expect(memberIds).not.toContain(gymBMember.memberId);
    });
  });

  // -------------------------------------------------------------------
  // Role authorization
  // -------------------------------------------------------------------
  describe('Role authorization', () => {
    it('a MEMBER cannot list gym-wide attendance', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-memberrole@example.com`);
      await request(server()).get('/api/v1/attendance').set('Authorization', `Bearer ${member.token}`).expect(403);
    });

    it('a TRAINER cannot list gym-wide attendance, despite having ATTENDANCE:MANAGE for their own class roster', async () => {
      await request(server()).get('/api/v1/attendance').set('Authorization', `Bearer ${trainerAToken}`).expect(403);
      await request(server()).get('/api/v1/attendance/today').set('Authorization', `Bearer ${trainerAToken}`).expect(403);
    });

    it('a TRAINER cannot manually check a member in at the front desk', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-trainerdenied@example.com`);
      await request(server())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ memberId: member.memberId })
        .expect(403);
    });

    it('FRONT_DESK can view and manage gym-wide attendance', async () => {
      await request(server()).get('/api/v1/attendance').set('Authorization', `Bearer ${frontDeskAToken}`).expect(200);
    });

    it('a MANAGER can manually check a member in', async () => {
      const member = await createMemberWithLogin(gymA.tenantId, `${MARKER}-managercheckin@example.com`);
      await giveActiveMembership(gymA.ownerToken, member.memberId, planAId);
      await request(server())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ memberId: member.memberId })
        .expect(201);
    });
  });

  // -------------------------------------------------------------------
  // Class / PT attendance marking
  // -------------------------------------------------------------------
  describe('Class attendance marking', () => {
    let classSeriesId: string;
    let classOccurrenceId: string;
    let bookingId: string;
    let bookingMember: { user: User; memberId: string; token: string };

    beforeAll(async () => {
      await request(server())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ userId: trainerA.id })
        .expect(201);
      await request(server())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ userId: trainerA2.id })
        .expect(201);

      // Two days out, so "already started" checks never flake regardless of when this suite runs.
      const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
      const futureDayOfWeek = DAY_NAMES[(new Date().getUTCDay() + 2) % 7];

      const series = await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({
          name: `${MARKER} Attendance Class`,
          category: 'HIIT',
          trainerId: trainerA.id,
          dayOfWeek: futureDayOfWeek,
          startTime: '07:00',
          durationMinutes: 45,
          capacity: 5,
          location: 'Studio A',
        })
        .expect(201);
      classSeriesId = series.body.data.id;

      const occurrences = await request(server())
        .get('/api/v1/classes')
        .query({ trainerId: trainerA.id })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      classOccurrenceId = (occurrences.body.data as { id: string; classSeriesId: string }[]).find((o) => o.classSeriesId === classSeriesId)!.id;

      bookingMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-classattendee@example.com`);
      const booking = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${bookingMember.token}`)
        .send({ classOccurrenceId })
        .expect(201);
      bookingId = booking.body.data.id;
    });

    it('rejects a different trainer from marking attendance on a class they do not teach', async () => {
      await request(server())
        .post(`/api/v1/class-bookings/${bookingId}/attendance`)
        .set('Authorization', `Bearer ${trainerA2Token}`)
        .send({ status: 'ATTENDED' })
        .expect(403);
    });

    it("the class's own trainer marks the booking ATTENDED", async () => {
      const response = await request(server())
        .post(`/api/v1/class-bookings/${bookingId}/attendance`)
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ status: 'ATTENDED' })
        .expect(201);
      expect(response.body.data.status).toBe('ATTENDED');
    });

    it('reverts the booking back to CONFIRMED, then marks it NO_SHOW', async () => {
      const reverted = await request(server())
        .post(`/api/v1/class-bookings/${bookingId}/attendance`)
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(201);
      expect(reverted.body.data.status).toBe('CONFIRMED');

      const noShow = await request(server())
        .post(`/api/v1/class-bookings/${bookingId}/attendance`)
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ status: 'NO_SHOW' })
        .expect(201);
      expect(noShow.body.data.status).toBe('NO_SHOW');
    });

    it('a MEMBER cannot mark class attendance', async () => {
      await request(server())
        .post(`/api/v1/class-bookings/${bookingId}/attendance`)
        .set('Authorization', `Bearer ${bookingMember.token}`)
        .send({ status: 'ATTENDED' })
        .expect(403);
    });

    it('an OWNER (gym-wide ATTENDANCE:MANAGE) can mark attendance on any trainer\'s class', async () => {
      const response = await request(server())
        .post(`/api/v1/class-bookings/${bookingId}/attendance`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ status: 'ATTENDED' })
        .expect(201);
      expect(response.body.data.status).toBe('ATTENDED');
    });
  });

  describe('PT session attendance marking', () => {
    let sessionId: string;
    let ptMember: { user: User; memberId: string; token: string };

    beforeAll(async () => {
      await request(server())
        .post('/api/v1/trainers/me/availability')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ dayOfWeek: 'THU', startTime: '14:00', endTime: '17:00' })
        .expect(201);

      const nextThursday = (() => {
        const d = new Date();
        const day = d.getUTCDay();
        const diff = (11 - day) % 7 || 7;
        d.setUTCDate(d.getUTCDate() + diff);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      })();

      ptMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-ptattendee@example.com`);
      const session = await request(server())
        .post('/api/v1/pt-sessions/me')
        .set('Authorization', `Bearer ${ptMember.token}`)
        .send({ trainerId: trainerA.id, date: nextThursday.toISOString().slice(0, 10), startTime: '14:00', durationMinutes: 60 })
        .expect(201);
      sessionId = session.body.data.id;
    });

    it('rejects a different trainer from marking attendance on a session that is not theirs', async () => {
      await request(server())
        .post(`/api/v1/pt-sessions/${sessionId}/attendance`)
        .set('Authorization', `Bearer ${trainerA2Token}`)
        .send({ status: 'COMPLETED' })
        .expect(403);
    });

    it("the session's own trainer marks it COMPLETED", async () => {
      const response = await request(server())
        .post(`/api/v1/pt-sessions/${sessionId}/attendance`)
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ status: 'COMPLETED' })
        .expect(201);
      expect(response.body.data.status).toBe('COMPLETED');
    });
  });
});
