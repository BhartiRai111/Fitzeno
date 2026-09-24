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
 * Trainers, Classes/Scheduling, Class Bookings/Waitlist, and Personal
 * Training — always against TWO independent gyms, mirroring the
 * members-leads e2e suite's own pattern. Sessions are minted directly via
 * JwtService (no login-throttle budget spent); only the two
 * /auth/register-business calls that create the gyms hit an HTTP auth
 * endpoint.
 */
describe('Trainers + Classes + Bookings + PT (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;

  const MARKER = 'e2e-tcb-test';
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
    await prisma.classBooking.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.personalTrainingSession.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.classOccurrence.deleteMany({ where: { classSeries: { tenant: { slug: { contains: MARKER } } } } });
    await prisma.classSeries.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.trainerAvailability.deleteMany({ where: { trainer: { tenant: { slug: { contains: MARKER } } } } });
    await prisma.trainer.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
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
  let trainerA: User;
  let trainerAToken: string;
  let managerAToken: string;
  let memberA: { user: User; memberId: string; token: string };
  let memberA2: { user: User; memberId: string; token: string };
  let memberA3: { user: User; memberId: string; token: string };

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

    trainerA = await createStaffUser(gymA.tenantId, 'TRAINER', `${MARKER}-trainer-a@example.com`);
    trainerAToken = mintAccessToken(trainerA);
    const managerA = await createStaffUser(gymA.tenantId, 'MANAGER', `${MARKER}-manager-a@example.com`);
    managerAToken = mintAccessToken(managerA);

    memberA = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a1@example.com`);
    memberA2 = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a2@example.com`);
    memberA3 = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a3@example.com`);
  });

  // -------------------------------------------------------------------
  // Trainer profiles + availability
  // -------------------------------------------------------------------
  let trainerProfileId: string;

  describe('Trainer profile + availability', () => {
    it('rejects creating a trainer profile for a non-TRAINER user', async () => {
      const managerUser = await createStaffUser(gymA.tenantId, 'MANAGER', `${MARKER}-not-a-trainer@example.com`);
      const response = await request(server())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ userId: managerUser.id })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a trainer profile', async () => {
      const response = await request(server())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ userId: trainerA.id, specialties: ['Spin', 'HIIT'], yearsExperience: 5 })
        .expect(201);

      expect(response.body.data.user).toMatchObject({ id: trainerA.id });
      trainerProfileId = response.body.data.id;
    });

    it('rejects a duplicate trainer profile for the same user', async () => {
      await request(server())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ userId: trainerA.id })
        .expect(409);
    });

    it('a TRAINER cannot create trainer profiles (OWNER/MANAGER only)', async () => {
      await request(server())
        .post('/api/v1/trainers')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ userId: trainerA.id })
        .expect(403);
    });

    it('a plain member can browse trainers with no permission grant', async () => {
      const response = await request(server())
        .get('/api/v1/trainers')
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      expect((response.body.data as { id: string }[]).some((t) => t.id === trainerProfileId)).toBe(true);
    });

    it("the trainer adds their own availability, and it's visible to a member", async () => {
      await request(server())
        .post('/api/v1/trainers/me/availability')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ dayOfWeek: 'MON', startTime: '09:00', endTime: '12:00' })
        .expect(201);

      const response = await request(server())
        .get(`/api/v1/trainers/${trainerProfileId}`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      expect(response.body.data.availability).toContainEqual(
        expect.objectContaining({ dayOfWeek: 'MON', startTime: '09:00', endTime: '12:00' }),
      );
    });

    it('rejects an overlapping availability window', async () => {
      await request(server())
        .post('/api/v1/trainers/me/availability')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ dayOfWeek: 'MON', startTime: '10:00', endTime: '13:00' })
        .expect(409);
    });
  });

  // -------------------------------------------------------------------
  // Classes / scheduling
  // -------------------------------------------------------------------
  let smallClassSeriesId: string;
  let smallClassOccurrenceId: string;

  describe('Classes and scheduling', () => {
    it('a MEMBER cannot create a class series', async () => {
      await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({
          name: 'Should Fail',
          category: 'HIIT',
          trainerId: trainerA.id,
          dayOfWeek: 'TUE',
          startTime: '18:00',
          durationMinutes: 45,
          capacity: 10,
          location: 'Studio A',
        })
        .expect(403);
    });

    it('creates a class series with capacity 1 (to exercise waitlisting)', async () => {
      const response = await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({
          name: `${MARKER} Sunrise Spin`,
          category: 'Spin',
          trainerId: trainerA.id,
          dayOfWeek: 'TUE',
          startTime: '06:00',
          durationMinutes: 45,
          capacity: 1,
          location: 'Conditioning Studio',
        })
        .expect(201);
      smallClassSeriesId = response.body.data.id;
      expect(response.body.data.trainer).toMatchObject({ id: trainerA.id });
    });

    it('rejects a second series for the same trainer that overlaps day/time', async () => {
      const response = await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({
          name: `${MARKER} Overlapping`,
          category: 'HIIT',
          trainerId: trainerA.id,
          dayOfWeek: 'TUE',
          startTime: '06:15',
          durationMinutes: 30,
          capacity: 10,
          location: 'Studio B',
        })
        .expect(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('browsing classes materializes and returns bookable occurrences', async () => {
      const response = await request(server())
        .get('/api/v1/classes')
        .query({ trainerId: trainerA.id })
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);

      const occurrences = response.body.data as { id: string; classSeriesId: string; seatsAvailable: number; capacity: number }[];
      const forSeries = occurrences.filter((o) => o.classSeriesId === smallClassSeriesId);
      expect(forSeries.length).toBeGreaterThan(0);
      smallClassOccurrenceId = forSeries[0]!.id;
      expect(forSeries[0]!.capacity).toBe(1);
      expect(forSeries[0]!.seatsAvailable).toBe(1);
    });

    it("gym B's browse never includes gym A's classes", async () => {
      const response = await request(server())
        .get('/api/v1/classes')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(200);
      const ids = (response.body.data as { classSeriesId: string }[]).map((o) => o.classSeriesId);
      expect(ids).not.toContain(smallClassSeriesId);
    });
  });

  // -------------------------------------------------------------------
  // Class bookings, capacity, and waitlist
  // -------------------------------------------------------------------
  describe('Class bookings, capacity, and waitlist', () => {
    it('member A books the last seat and is CONFIRMED', async () => {
      const response = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ classOccurrenceId: smallClassOccurrenceId })
        .expect(201);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('member A booking the same class again is rejected as a duplicate', async () => {
      const response = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ classOccurrenceId: smallClassOccurrenceId })
        .expect(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('member A2 books the now-full class and is WAITLISTED', async () => {
      const response = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA2.token}`)
        .send({ classOccurrenceId: smallClassOccurrenceId })
        .expect(201);
      expect(response.body.data.status).toBe('WAITLISTED');
    });

    it('an inactive member cannot book at all', async () => {
      const inactiveMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-inactive@example.com`, 'INACTIVE');
      const response = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${inactiveMember.token}`)
        .send({ classOccurrenceId: smallClassOccurrenceId })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('staff sees the waitlist in FIFO order', async () => {
      const response = await request(server())
        .get(`/api/v1/class-bookings/waitlist/${smallClassOccurrenceId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].member.id).toBe(memberA2.memberId);
    });

    it("member A cancelling frees their seat and auto-promotes member A2 (FIFO)", async () => {
      const listBefore = await request(server())
        .get('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      const bookingId = (listBefore.body.data as { id: string; status: string }[]).find((b) => b.status === 'CONFIRMED')!.id;

      await request(server())
        .post(`/api/v1/class-bookings/me/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(201);

      const a2Bookings = await request(server())
        .get('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA2.token}`)
        .expect(200);
      expect(a2Bookings.body.data[0].status).toBe('CONFIRMED');
    });

    it('member A can rebook the same class (row reuse) after cancelling, joining the waitlist since it is full again', async () => {
      const response = await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ classOccurrenceId: smallClassOccurrenceId })
        .expect(201);
      expect(response.body.data.status).toBe('WAITLISTED');
    });

    it('rejects promoting into a still-full class, and staff can skip FIFO order once a seat opens up', async () => {
      // At this point: memberA WAITLISTED (from the rebook above), memberA2 CONFIRMED, capacity 1 (full).
      const listBefore = await request(server())
        .get('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      const memberAWaitlistedId = listBefore.body.data[0].id as string;

      await request(server())
        .post(`/api/v1/class-bookings/${memberAWaitlistedId}/promote`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(400);

      // memberA3 joins the waitlist behind memberA — now two people are waiting.
      await request(server())
        .post('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA3.token}`)
        .send({ classOccurrenceId: smallClassOccurrenceId })
        .expect(201);

      // Staff raises capacity (opens a seat without auto-promoting anyone), then
      // deliberately promotes memberA3, skipping memberA who waited first —
      // the approved frontend's "Promote to Booked" override action.
      await request(server())
        .patch(`/api/v1/classes/${smallClassOccurrenceId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ capacity: 2 })
        .expect(200);

      const a3Bookings = await request(server())
        .get('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA3.token}`)
        .expect(200);
      const memberA3WaitlistedId = a3Bookings.body.data[0].id as string;

      const response = await request(server())
        .post(`/api/v1/class-bookings/${memberA3WaitlistedId}/promote`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(response.body.data.status).toBe('CONFIRMED');

      const memberAStillWaitlisted = await request(server())
        .get('/api/v1/class-bookings/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      expect(memberAStillWaitlisted.body.data[0].status).toBe('WAITLISTED');
    });

    it('a TRAINER only sees bookings for classes they teach', async () => {
      const response = await request(server())
        .get('/api/v1/class-bookings')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      for (const booking of response.body.data as { classOccurrence: { id: string } }[]) {
        expect(booking.classOccurrence.id).toBe(smallClassOccurrenceId);
      }
    });

    it('cancelling the whole class series cascades to cancel the occurrence and its bookings', async () => {
      await request(server())
        .post(`/api/v1/classes/series/${smallClassSeriesId}/cancel`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ reason: 'e2e test cleanup' })
        .expect(201);

      const occurrence = await request(server())
        .get(`/api/v1/classes/${smallClassOccurrenceId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(occurrence.body.data.status).toBe('CANCELLED');

      const booking = await prisma.classBooking.findFirst({ where: { classOccurrenceId: smallClassOccurrenceId, memberId: memberA.memberId } });
      expect(booking?.status).toBe('CANCELLED');
    });
  });

  // -------------------------------------------------------------------
  // Personal Training
  // -------------------------------------------------------------------
  describe('Personal training', () => {
    it("computes the trainer's free slots for Monday, minus their existing availability windows", async () => {
      const nextMonday = new Date();
      nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7));
      const dateStr = nextMonday.toISOString().slice(0, 10);

      const response = await request(server())
        .get('/api/v1/pt-sessions/available-slots')
        .query({ trainerId: trainerA.id, date: dateStr })
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);

      expect(response.body.data).toContainEqual({ startTime: '09:00', endTime: '12:00' });

      // Books a PT session and confirms the slot narrows afterward.
      await request(server())
        .post('/api/v1/pt-sessions/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ trainerId: trainerA.id, date: dateStr, startTime: '09:00', durationMinutes: 60 })
        .expect(201);

      const after = await request(server())
        .get('/api/v1/pt-sessions/available-slots')
        .query({ trainerId: trainerA.id, date: dateStr })
        .set('Authorization', `Bearer ${memberA2.token}`)
        .expect(200);
      expect(after.body.data).toContainEqual({ startTime: '10:00', endTime: '12:00' });
    });

    it('rejects booking outside the trainer\'s availability window', async () => {
      const nextMonday = new Date();
      nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7));
      const dateStr = nextMonday.toISOString().slice(0, 10);

      const response = await request(server())
        .post('/api/v1/pt-sessions/me')
        .set('Authorization', `Bearer ${memberA2.token}`)
        .send({ trainerId: trainerA.id, date: dateStr, startTime: '14:00', durationMinutes: 60 })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects double-booking the trainer for an overlapping time', async () => {
      const nextMonday = new Date();
      nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7));
      const dateStr = nextMonday.toISOString().slice(0, 10);

      const response = await request(server())
        .post('/api/v1/pt-sessions/me')
        .set('Authorization', `Bearer ${memberA2.token}`)
        .send({ trainerId: trainerA.id, date: dateStr, startTime: '09:30', durationMinutes: 30 })
        .expect(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('the member can reschedule and then cancel their own session', async () => {
      const listResponse = await request(server())
        .get('/api/v1/pt-sessions/me')
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(200);
      const sessionId = listResponse.body.data[0].id as string;

      const rescheduled = await request(server())
        .patch(`/api/v1/pt-sessions/me/${sessionId}`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ startTime: '10:00' })
        .expect(200);
      expect(rescheduled.body.data.startTime).toBe('10:00');

      // The session is far enough out to be outside the cancellation window, so this succeeds.
      const cancelled = await request(server())
        .post(`/api/v1/pt-sessions/me/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .expect(201);
      expect(cancelled.body.data.status).toBe('CANCELLED');
    });
  });

  // -------------------------------------------------------------------
  // Cross-tenant isolation
  // -------------------------------------------------------------------
  describe('Cross-tenant isolation', () => {
    it("gym B's owner cannot read gym A's trainer profile by id", async () => {
      await request(server())
        .get(`/api/v1/trainers/${trainerProfileId}`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(404);
    });

    it("gym B's owner cannot read gym A's class series by id", async () => {
      await request(server())
        .get(`/api/v1/classes/series/${smallClassSeriesId}`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(404);
    });

    it("gym B's owner cannot cancel gym A's class series", async () => {
      await request(server())
        .post(`/api/v1/classes/series/${smallClassSeriesId}/cancel`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({})
        .expect(404);
    });
  });

  // -------------------------------------------------------------------
  // Role authorization
  // -------------------------------------------------------------------
  describe('Role authorization', () => {
    it('a MANAGER (staff default: bookings:manage) can book a class on behalf of a member', async () => {
      const series = await request(server())
        .post('/api/v1/classes/series')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({
          name: `${MARKER} Manager Booked Class`,
          category: 'Yoga',
          trainerId: trainerA.id,
          dayOfWeek: 'WED',
          startTime: '07:00',
          durationMinutes: 60,
          capacity: 10,
          location: 'Studio A',
        })
        .expect(201);

      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const occurrences = await request(server())
        .get('/api/v1/classes')
        .query({ trainerId: trainerA.id, category: 'Yoga', from: tomorrow.toISOString().slice(0, 10) })
        .set('Authorization', `Bearer ${managerAToken}`)
        .expect(200);
      const occurrenceId = (occurrences.body.data as { id: string; classSeriesId: string }[]).find(
        (o) => o.classSeriesId === series.body.data.id,
      )!.id;

      const response = await request(server())
        .post('/api/v1/class-bookings')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ classOccurrenceId: occurrenceId, memberId: memberA2.memberId })
        .expect(201);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('a plain member cannot manage class series or force-cancel bookings', async () => {
      await request(server())
        .patch(`/api/v1/classes/series/${smallClassSeriesId}`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ capacity: 99 })
        .expect(403);
    });
  });
});
