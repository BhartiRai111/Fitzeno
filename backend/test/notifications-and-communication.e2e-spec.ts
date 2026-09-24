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
import { NotificationsSchedulerService } from '../src/notifications/notifications-scheduler.service.js';
import type { User } from '../src/generated/prisma/client.js';

/**
 * Notifications & Communication — always against TWO independent gyms,
 * mirroring every other e2e suite's own pattern. Sessions are minted
 * directly via JwtService; only the two /auth/register-business calls hit
 * an HTTP auth endpoint.
 *
 * Every business-triggered notification is created by an EventEmitter2
 * listener that the emitting request does NOT await (see
 * NotificationsEventListener's own comment) — so assertions that depend on
 * a side-effect notification poll briefly instead of assuming it exists
 * the instant the triggering HTTP call returns.
 */
describe('Notifications & Communication (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;
  let scheduler: NotificationsSchedulerService;

  const MARKER = 'e2e-notif-test';
  const KNOWN_PASSWORD = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    passwordService = app.get(PasswordService);
    scheduler = app.get(NotificationsSchedulerService);

    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.notification.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.notificationPreference.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.announcement.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.classBooking.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.personalTrainingSession.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.classOccurrence.deleteMany({ where: { classSeries: { tenant: { slug: { contains: MARKER } } } } });
    await prisma.classSeries.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.trainerAvailability.deleteMany({ where: { trainer: { tenant: { slug: { contains: MARKER } } } } });
    await prisma.trainer.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.refund.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.invoice.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.transaction.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.invoiceCounter.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.memberMembership.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.membershipPlan.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.lead.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
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

  async function createMemberWithLogin(tenantId: string, email: string): Promise<{ user: User; memberId: string; token: string }> {
    const user = await createStaffUser(tenantId, 'FRONT_DESK', email);
    await prisma.user.update({ where: { id: user.id }, data: { role: 'MEMBER' } });
    const member = await prisma.member.create({
      data: { tenantId, userId: user.id, firstName: 'Test', lastName: 'Member', email, status: 'ACTIVE' },
    });
    return { user: { ...user, role: 'MEMBER' } as User, memberId: member.id, token: mintAccessToken({ ...user, role: 'MEMBER' as never }) };
  }

  /** Fire-and-forget event listeners mean a triggered notification isn't necessarily written the instant the HTTP call returns — poll briefly rather than assume synchronous availability. */
  async function waitForNotification(
    token: string,
    predicate: (n: { title: string; category: string; relatedEntityId: string | null }) => boolean,
    attempts = 30,
  ): Promise<{ title: string; category: string; relatedEntityId: string | null }> {
    for (let i = 0; i < attempts; i++) {
      const response = await request(server()).get('/api/v1/notifications/me').query({ limit: 100 }).set('Authorization', `Bearer ${token}`);
      const found = (response.body.data as { title: string; category: string; relatedEntityId: string | null }[]).find(predicate);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    throw new Error('Expected notification did not appear in time.');
  }

  async function assertNoNotification(
    token: string,
    predicate: (n: { title: string; relatedEntityId: string | null }) => boolean,
  ): Promise<void> {
    // A short settle window — long enough for any in-flight listener to finish, short enough to keep the suite fast.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const response = await request(server()).get('/api/v1/notifications/me').query({ limit: 100 }).set('Authorization', `Bearer ${token}`);
    const found = (response.body.data as { title: string; relatedEntityId: string | null }[]).find(predicate);
    expect(found).toBeUndefined();
  }

  let gymA: { tenantId: string; slug: string; ownerToken: string; ownerId: string };
  let gymB: { tenantId: string; slug: string; ownerToken: string };
  let managerA: User;
  let managerAToken: string;
  let trainerA: User;
  let trainerAToken: string;
  let memberA: { user: User; memberId: string; token: string };
  let memberA2: { user: User; memberId: string; token: string };
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
    gymA = { tenantId: tenantIdA, slug: tenantA.slug, ownerToken: resA.body.data.accessToken, ownerId: resA.body.data.user.id };

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

    managerA = await createStaffUser(gymA.tenantId, 'MANAGER', `${MARKER}-manager-a@example.com`);
    managerAToken = mintAccessToken(managerA);
    trainerA = await createStaffUser(gymA.tenantId, 'TRAINER', `${MARKER}-trainer-a@example.com`);
    trainerAToken = mintAccessToken(trainerA);

    memberA = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a1@example.com`);
    memberA2 = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a2@example.com`);

    const plan = await request(server())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${gymA.ownerToken}`)
      .send({ name: `${MARKER} Basic`, price: 49, billingPeriod: 'MONTHLY' })
      .expect(201);
    planAId = plan.body.data.id;
  });

  // -------------------------------------------------------------------
  // Booking lifecycle notifications
  // -------------------------------------------------------------------
  describe('Class booking notifications', () => {
    let occurrenceId: string;
    let firstBookingId: string;

    beforeAll(async () => {
      await request(server())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ userId: trainerA.id, bio: 'Coach', specialties: ['Strength'] })
        .expect(201);
      await request(server())
        .post('/api/v1/trainers/me/availability')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ dayOfWeek: 'MON', startTime: '06:00', endTime: '20:00' })
        .expect(201);

      const series = await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({
          name: `${MARKER} Strength`,
          category: 'Strength',
          trainerId: trainerA.id,
          dayOfWeek: 'MON',
          startTime: '09:00',
          durationMinutes: 45,
          capacity: 1,
          location: 'Studio A',
        })
        .expect(201);

      const browse = await request(server())
        .get('/api/v1/classes')
        .query({ trainerId: trainerA.id })
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      occurrenceId = (browse.body.data as { id: string; classSeriesId: string }[]).find((o) => o.classSeriesId === series.body.data.id)!.id;
    });

    it('booking confirmed notifies the member (category BOOKING)', async () => {
      const booking = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ classOccurrenceId: occurrenceId })
        .expect(201);
      firstBookingId = booking.body.data.id;
      expect(booking.body.data.status).toBe('CONFIRMED');

      const notif = await waitForNotification(memberA.token, (n) => n.relatedEntityId === firstBookingId && n.category === 'BOOKING');
      expect(notif.title).toBe('Class booking confirmed');
    });

    it('a second booking against the now-full class waitlists the member (category WAITLIST)', async () => {
      const booking = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA2.token}`)
        .send({ classOccurrenceId: occurrenceId })
        .expect(201);
      expect(booking.body.data.status).toBe('WAITLISTED');

      const notif = await waitForNotification(memberA2.token, (n) => n.relatedEntityId === booking.body.data.id && n.category === 'WAITLIST');
      expect(notif.title).toBe("You're on the waitlist");
    });

    it('staff cancelling the confirmed booking notifies that member AND promotes+notifies the waitlisted one', async () => {
      await request(server())
        .post(`/api/v1/class-bookings/${firstBookingId}/cancel`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);

      const cancelledNotif = await waitForNotification(memberA.token, (n) => n.relatedEntityId === firstBookingId && n.title === 'Booking cancelled');
      expect(cancelledNotif.category).toBe('BOOKING');

      const promotedNotif = await waitForNotification(memberA2.token, (n) => n.title === "You're off the waitlist!");
      expect(promotedNotif.category).toBe('BOOKING');
    });

    it('a member cancelling their own booking does NOT notify them about their own action', async () => {
      // A fresh occurrence — reusing `occurrenceId` here would reuse memberA's
      // existing (previously staff-cancelled) row for this occurrence per the
      // schema's own booking-row-reuse convention, and re-surface that
      // earlier staff-cancellation notification as a false positive.
      const series = await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({
          name: `${MARKER} Self-Cancel Test`,
          category: 'Strength',
          trainerId: trainerA.id,
          dayOfWeek: 'WED',
          startTime: '09:00',
          durationMinutes: 30,
          capacity: 5,
          location: 'Studio C',
        })
        .expect(201);
      const browse = await request(server()).get('/api/v1/classes').query({ trainerId: trainerA.id }).set('Authorization', `Bearer ${memberA.token}`).expect(200);
      const freshOccurrenceId = (browse.body.data as { id: string; classSeriesId: string }[]).find((o) => o.classSeriesId === series.body.data.id)!.id;

      const booking = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ classOccurrenceId: freshOccurrenceId })
        .expect(201);

      await request(server())
        .post(`/api/v1/class-bookings/me/${booking.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(201);

      await assertNoNotification(memberA.token, (n) => n.relatedEntityId === booking.body.data.id && n.title === 'Booking cancelled');
    });

    it('cancelling the whole class session notifies every booked member and the trainer', async () => {
      // memberA2 is already CONFIRMED on occurrenceId from the earlier
      // FIFO-promotion test — no need to book again.
      await request(server())
        .post(`/api/v1/classes/${occurrenceId}/cancel`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ reason: 'Trainer sick' })
        .expect(201);

      const memberNotif = await waitForNotification(memberA2.token, (n) => n.relatedEntityId === occurrenceId && n.title === 'Class cancelled');
      expect(memberNotif.category).toBe('CLASS');

      const trainerNotif = await waitForNotification(trainerAToken, (n) => n.relatedEntityId === occurrenceId && n.title === 'Your class was cancelled');
      expect(trainerNotif.category).toBe('CLASS');
    });
  });

  // -------------------------------------------------------------------
  // Personal training notifications
  // -------------------------------------------------------------------
  describe('PT session notifications', () => {
    let sessionId: string;

    it('booking a PT session notifies the trainer, not the member who just booked it', async () => {
      const booking = await request(server())
        .post('/api/v1/pt-sessions/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ trainerId: trainerA.id, date: '2027-01-04', startTime: '10:00', durationMinutes: 30 })
        .expect(201);
      sessionId = booking.body.data.id;

      const trainerNotif = await waitForNotification(trainerAToken, (n) => n.relatedEntityId === sessionId && n.title === 'New PT booking');
      expect(trainerNotif.category).toBe('BOOKING');

      await assertNoNotification(memberA.token, (n) => n.relatedEntityId === sessionId);
    });

    it('the member cancelling their own PT session notifies the trainer', async () => {
      await request(server())
        .post(`/api/v1/pt-sessions/me/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(201);

      const trainerNotif = await waitForNotification(trainerAToken, (n) => n.relatedEntityId === sessionId && n.title === 'Session cancelled');
      expect(trainerNotif.category).toBe('BOOKING');
    });

    it('staff cancelling a PT session notifies the member', async () => {
      const booking = await request(server())
        .post('/api/v1/pt-sessions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ trainerId: trainerA.id, memberId: memberA.memberId, date: '2027-01-11', startTime: '10:00', durationMinutes: 30 })
        .expect(201);

      await request(server()).post(`/api/v1/pt-sessions/${booking.body.data.id}/cancel`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(201);

      const memberNotif = await waitForNotification(memberA.token, (n) => n.relatedEntityId === booking.body.data.id && n.title === 'Session cancelled');
      expect(memberNotif.category).toBe('BOOKING');
    });
  });

  // -------------------------------------------------------------------
  // Membership + payment notifications
  // -------------------------------------------------------------------
  describe('Membership and payment notifications', () => {
    let membershipId: string;

    it('a paid membership purchase notifies the member with both a RENEWAL and a PAYMENT notification', async () => {
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, planId: planAId, paymentMethod: 'CARD' })
        .expect(201);
      membershipId = created.body.data.id;

      const startedNotif = await waitForNotification(memberA.token, (n) => n.relatedEntityId === membershipId && n.title === 'Membership started');
      expect(startedNotif.category).toBe('RENEWAL');

      const paymentNotif = await waitForNotification(memberA.token, (n) => n.title === 'Payment received');
      expect(paymentNotif.category).toBe('PAYMENT');
    });

    it('a comp membership (no paymentMethod) notifies the member but creates no payment notification', async () => {
      const fresh = await createMemberWithLogin(gymA.tenantId, `${MARKER}-comp@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: fresh.memberId, planId: planAId })
        .expect(201);

      await waitForNotification(fresh.token, (n) => n.relatedEntityId === created.body.data.id && n.title === 'Membership started');
      await assertNoNotification(fresh.token, (n) => n.title === 'Payment received');
    });

    it('renewing a membership notifies the member', async () => {
      const renewed = await request(server())
        .post(`/api/v1/memberships/${membershipId}/renew`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ paymentMethod: 'CASH' })
        .expect(201);

      const notif = await waitForNotification(memberA.token, (n) => n.relatedEntityId === renewed.body.data.id && n.title === 'Membership renewed');
      expect(notif.category).toBe('RENEWAL');
    });

    it('cancelling a membership notifies the member', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-cancel-notif@example.com`);
      const created = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: m.memberId, planId: planAId })
        .expect(201);

      await request(server()).post(`/api/v1/memberships/${created.body.data.id}/cancel`).set('Authorization', `Bearer ${gymA.ownerToken}`).send({}).expect(201);

      const notif = await waitForNotification(m.token, (n) => n.relatedEntityId === created.body.data.id && n.title === 'Membership cancelled');
      expect(notif.category).toBe('RENEWAL');
    });

    it('a failed payment notifies both the member and gym staff (owner/manager/front-desk)', async () => {
      const txn = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Guest pass fee', amount: 15, method: 'ONLINE' })
        .expect(201);

      // A manual /transactions POST is always PAID immediately — insert a
      // PENDING one directly to exercise the mark-failed path, the same
      // approach the payments e2e suite uses for this scenario.
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: gymA.tenantId } });
      const pending = await prisma.transaction.create({
        data: { tenantId: gymA.tenantId, memberId: memberA.memberId, type: 'OTHER', description: 'Card payment', amount: 30, currency: tenant.currency, method: 'CARD', status: 'PENDING' },
      });
      void txn;

      await request(server())
        .post(`/api/v1/transactions/${pending.id}/mark-failed`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ reason: 'Card declined' })
        .expect(201);

      const memberNotif = await waitForNotification(memberA.token, (n) => n.relatedEntityId === pending.id && n.title === 'Payment failed');
      expect(memberNotif.category).toBe('PAYMENT');

      const ownerNotif = await waitForNotification(gymA.ownerToken, (n) => n.relatedEntityId === pending.id && n.title === 'Payment failed');
      expect(ownerNotif.category).toBe('PAYMENT');
      const managerNotif = await waitForNotification(managerAToken, (n) => n.relatedEntityId === pending.id && n.title === 'Payment failed');
      expect(managerNotif.category).toBe('PAYMENT');

      // A TRAINER has no PAYMENTS visibility by default and is never targeted.
      await assertNoNotification(trainerAToken, (n) => n.relatedEntityId === pending.id);
    });

    it('a refund notifies the member', async () => {
      const created = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'To be refunded', amount: 40, method: 'CASH' })
        .expect(201);
      const refund = await request(server()).post(`/api/v1/transactions/${created.body.data.id}/refund`).set('Authorization', `Bearer ${gymA.ownerToken}`).send({}).expect(201);

      // The notification's context is the Refund itself (there can be
      // multiple refunds against one transaction), not the transaction id.
      const notif = await waitForNotification(memberA.token, (n) => n.relatedEntityId === refund.body.data.id && n.title === 'Refund issued');
      expect(notif.category).toBe('PAYMENT');
    });
  });

  // -------------------------------------------------------------------
  // In-app notification API
  // -------------------------------------------------------------------
  describe('In-app notification API', () => {
    it('lists notifications paginated, never returning unlimited history in one call', async () => {
      const response = await request(server()).get('/api/v1/notifications/me').query({ limit: 3 }).set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.meta).toEqual(expect.objectContaining({ limit: 3 }));
    });

    it('filters by category', async () => {
      const response = await request(server())
        .get('/api/v1/notifications/me')
        .query({ category: 'PAYMENT', limit: 50 })
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      for (const row of response.body.data as { category: string }[]) {
        expect(row.category).toBe('PAYMENT');
      }
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('returns an accurate unread count, then mark-read decrements it', async () => {
      const before = await request(server()).get('/api/v1/notifications/me/unread-count').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(before.body.data.count).toBeGreaterThan(0);

      const list = await request(server()).get('/api/v1/notifications/me').query({ unread: true, limit: 1 }).set('Authorization', `Bearer ${memberA.token}`).expect(200);
      const id = list.body.data[0].id as string;

      const marked = await request(server()).post(`/api/v1/notifications/me/${id}/read`).set('Authorization', `Bearer ${memberA.token}`).expect(201);
      expect(marked.body.data.read).toBe(true);

      const after = await request(server()).get('/api/v1/notifications/me/unread-count').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(after.body.data.count).toBe(before.body.data.count - 1);
    });

    it('mark-all-read clears the unread count entirely', async () => {
      await request(server()).post('/api/v1/notifications/me/read-all').set('Authorization', `Bearer ${memberA2.token}`).expect(201);
      const after = await request(server()).get('/api/v1/notifications/me/unread-count').set('Authorization', `Bearer ${memberA2.token}`).expect(200);
      expect(after.body.data.count).toBe(0);
    });

    it("a member cannot read another member's notification by id (404, not 403 — a private inbox has no 'wrong scope' case)", async () => {
      const list = await request(server()).get('/api/v1/notifications/me').query({ limit: 1 }).set('Authorization', `Bearer ${memberA.token}`).expect(200);
      const id = list.body.data[0].id as string;

      await request(server()).get(`/api/v1/notifications/me/${id}`).set('Authorization', `Bearer ${memberA2.token}`).expect(404);
    });

    it("gym B's owner never sees gym A's notifications", async () => {
      const response = await request(server()).get('/api/v1/notifications/me').query({ limit: 100 }).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  // Preferences
  // -------------------------------------------------------------------
  describe('Notification preferences', () => {
    it("returns a MEMBER's toggleable categories, all enabled by default", async () => {
      const response = await request(server()).get('/api/v1/notifications/me/preferences').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      const categories = (response.body.data as { category: string; enabled: boolean }[]).map((p) => p.category);
      expect(categories).toContain('BOOKING');
      expect(categories).not.toContain('LEAD');
      expect((response.body.data as { enabled: boolean }[]).every((p) => p.enabled)).toBe(true);
    });

    it('a member can disable PROMOTION, and subsequently receives no promotional-category notification', async () => {
      const updated = await request(server())
        .patch('/api/v1/notifications/me/preferences')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ preferences: [{ category: 'PROMOTION', enabled: false }] })
        .expect(200);
      expect(updated.body.data.find((p: { category: string }) => p.category === 'PROMOTION').enabled).toBe(false);
    });

    it("rejects a category not available to the caller's role", async () => {
      const response = await request(server())
        .patch('/api/v1/notifications/me/preferences')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ preferences: [{ category: 'STAFF', enabled: false }] })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects disabling a non-toggleable category', async () => {
      const response = await request(server())
        .patch('/api/v1/notifications/me/preferences')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ preferences: [{ category: 'SYSTEM', enabled: false }] })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('disabling BOOKING for a member suppresses future booking-confirmed notifications for them', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-pref-suppress@example.com`);
      await request(server())
        .patch('/api/v1/notifications/me/preferences')
        .set('Authorization', `Bearer ${m.token}`)
        .send({ preferences: [{ category: 'BOOKING', enabled: false }] })
        .expect(200);

      const series = await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({
          name: `${MARKER} Pref Test Class`,
          category: 'Strength',
          trainerId: trainerA.id,
          dayOfWeek: 'TUE',
          startTime: '07:00',
          durationMinutes: 30,
          capacity: 5,
          location: 'Studio B',
        })
        .expect(201);
      const browse = await request(server()).get('/api/v1/classes').query({ trainerId: trainerA.id }).set('Authorization', `Bearer ${m.token}`).expect(200);
      const occ = (browse.body.data as { id: string; classSeriesId: string }[]).find((o) => o.classSeriesId === series.body.data.id)!;

      const booking = await request(server()).post('/api/v1/class-bookings/me').set('Authorization', `Bearer ${m.token}`).send({ classOccurrenceId: occ.id }).expect(201);

      await assertNoNotification(m.token, (n) => n.relatedEntityId === booking.body.data.id);
    });
  });

  // -------------------------------------------------------------------
  // Announcements
  // -------------------------------------------------------------------
  describe('Announcements', () => {
    it('a MEMBER cannot send an announcement', async () => {
      await request(server())
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ title: 'Should fail', message: 'x', audience: 'ALL_MEMBERS' })
        .expect(403);
    });

    it('the audience-count preview matches the actual send\'s recipientCount', async () => {
      const preview = await request(server())
        .get('/api/v1/announcements/audience-count')
        .query({ audience: 'ALL_MEMBERS' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);

      const sent = await request(server())
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: `${MARKER} Early close Friday`, message: "We'll close early Friday.", audience: 'ALL_MEMBERS', priority: 'HIGH' })
        .expect(201);

      expect(sent.body.data.recipientCount).toBe(preview.body.data.count);
      expect(sent.body.data.recipientCount).toBeGreaterThan(0);
    });

    it('every eligible member receives an ANNOUNCEMENT-category notification', async () => {
      const notif = await waitForNotification(memberA2.token, (n) => n.title === `${MARKER} Early close Friday`);
      expect(notif.category).toBe('ANNOUNCEMENT');
    });

    it('lists sent announcements for owner/manager', async () => {
      const response = await request(server()).get('/api/v1/announcements').set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("a MEMBER cannot list sent announcements", async () => {
      await request(server()).get('/api/v1/announcements').set('Authorization', `Bearer ${memberA.token}`).expect(403);
    });

    it("gym B's owner never sees gym A's sent announcements", async () => {
      const response = await request(server()).get('/api/v1/announcements').set('Authorization', `Bearer ${gymB.ownerToken}`).expect(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('PLAN_MEMBERS audience requires planId and targets only members currently on that plan', async () => {
      const missing = await request(server())
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Plan update', message: 'x', audience: 'PLAN_MEMBERS' })
        .expect(400);
      expect(missing.body.error.code).toBe('VALIDATION_ERROR');

      const sent = await request(server())
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: `${MARKER} Plan-specific update`, message: 'x', audience: 'PLAN_MEMBERS', planId: planAId })
        .expect(201);
      // memberA holds the plan (from the earlier purchase/renewal tests).
      expect(sent.body.data.recipientCount).toBeGreaterThan(0);
    });

    it('ALL_TRAINERS audience reaches trainers but not members', async () => {
      const sent = await request(server())
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: `${MARKER} Trainer-only update`, message: 'x', audience: 'ALL_TRAINERS' })
        .expect(201);
      expect(sent.body.data.recipientCount).toBe(1);

      const notif = await waitForNotification(trainerAToken, (n) => n.title === `${MARKER} Trainer-only update`);
      expect(notif.category).toBe('ANNOUNCEMENT');
      await assertNoNotification(memberA.token, (n) => n.title === `${MARKER} Trainer-only update`);
    });
  });

  // -------------------------------------------------------------------
  // Scheduled reminders — triggered directly rather than waiting on a real
  // cron tick (see NotificationsSchedulerService's own comment on why
  // every job method is independently callable).
  // -------------------------------------------------------------------
  describe('Scheduled reminders', () => {
    it('sends a membership-expiry reminder exactly 7 days before endDate, and is idempotent on a second run', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-expiry-soon@example.com`);
      const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
      const startDate = new Date(today);
      startDate.setUTCDate(startDate.getUTCDate() - 23);
      const endDate = new Date(today);
      endDate.setUTCDate(endDate.getUTCDate() + 7);
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: gymA.tenantId } });
      const membership = await prisma.memberMembership.create({
        data: { tenantId: gymA.tenantId, memberId: m.memberId, planId: planAId, planName: 'Basic', price: 49, billingPeriod: 'MONTHLY', startDate, endDate, status: 'ACTIVE' },
      });
      void tenant;

      await scheduler.sendMembershipExpiryReminders();
      const notif = await waitForNotification(m.token, (n) => n.relatedEntityId === membership.id, 5);
      expect(notif.title).toBe('Membership expires in 7 days');

      // Re-running the same job must not create a duplicate — the dedupKey unique constraint enforces exactly-once.
      await scheduler.sendMembershipExpiryReminders();
      const countAfter = await prisma.notification.count({ where: { relatedEntityId: membership.id } });
      expect(countAfter).toBe(1);
    });

    it('sends a membership-expired notice the day after endDate passes', async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-just-expired@example.com`);
      const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const startDate = new Date(yesterday);
      startDate.setUTCDate(startDate.getUTCDate() - 30);
      const membership = await prisma.memberMembership.create({
        data: { tenantId: gymA.tenantId, memberId: m.memberId, planId: planAId, planName: 'Basic', price: 49, billingPeriod: 'MONTHLY', startDate, endDate: yesterday, status: 'ACTIVE' },
      });

      await scheduler.sendMembershipExpiredNotices();
      const notif = await waitForNotification(m.token, (n) => n.relatedEntityId === membership.id, 5);
      expect(notif.title).toBe('Membership expired');
    });

    it("notifies the assigned staff member when their lead's follow-up is due today", async () => {
      const today = new Date();
      const lead = await prisma.lead.create({
        data: { tenantId: gymA.tenantId, firstName: 'Ben', lastName: 'Foster', source: 'WEBSITE', assignedToId: managerA.id, nextFollowUpAt: today },
      });

      await scheduler.sendLeadFollowUpReminders();
      const notif = await waitForNotification(managerAToken, (n) => n.relatedEntityId === lead.id, 5);
      expect(notif.title).toBe('Lead follow-up due');
      expect(notif.category).toBe('LEAD');
    });

    it('broadcasts to lead-managing staff when a due lead has no assignee', async () => {
      const today = new Date();
      const lead = await prisma.lead.create({
        data: { tenantId: gymA.tenantId, firstName: 'Naomi', lastName: 'Clarke', source: 'INSTAGRAM', nextFollowUpAt: today },
      });

      await scheduler.sendLeadFollowUpReminders();
      const ownerNotif = await waitForNotification(gymA.ownerToken, (n) => n.relatedEntityId === lead.id, 5);
      expect(ownerNotif.category).toBe('LEAD');
    });

    it("sends an upcoming-class reminder to a member confirmed for tomorrow's session", async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-class-reminder@example.com`);
      const tomorrow = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1));
      const series = await prisma.classSeries.create({
        data: { tenantId: gymA.tenantId, name: `${MARKER} Reminder Class`, category: 'HIIT', trainerId: trainerA.id, dayOfWeek: 'MON', startTime: '09:00', durationMinutes: 30, capacity: 10, location: 'Studio A', startDate: tomorrow },
      });
      const occurrence = await prisma.classOccurrence.create({
        data: { tenantId: gymA.tenantId, classSeriesId: series.id, date: tomorrow, startTime: '09:00', endTime: '09:30', trainerId: trainerA.id, location: 'Studio A', capacity: 10, status: 'SCHEDULED' },
      });
      await prisma.classBooking.create({ data: { tenantId: gymA.tenantId, classOccurrenceId: occurrence.id, memberId: m.memberId, status: 'CONFIRMED' } });

      await scheduler.sendUpcomingClassReminders();
      const notif = await waitForNotification(m.token, (n) => n.relatedEntityId === occurrence.id, 5);
      expect(notif.title).toBe('Upcoming class tomorrow');
    });

    it("sends an upcoming-PT-session reminder for tomorrow's confirmed session", async () => {
      const m = await createMemberWithLogin(gymA.tenantId, `${MARKER}-pt-reminder@example.com`);
      const tomorrow = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1));
      const session = await prisma.personalTrainingSession.create({
        data: { tenantId: gymA.tenantId, trainerId: trainerA.id, memberId: m.memberId, date: tomorrow, startTime: '11:00', durationMinutes: 30, status: 'CONFIRMED' },
      });

      await scheduler.sendUpcomingPtSessionReminders();
      const notif = await waitForNotification(m.token, (n) => n.relatedEntityId === session.id, 5);
      expect(notif.title).toBe('Upcoming PT session tomorrow');
    });
  });
});
