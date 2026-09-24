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
 * Members + Leads/CRM, always against TWO independent gyms — the only
 * convincing proof that a member or lead in one gym is unreachable from
 * the other. Throttle budgets: /auth/register-business (3/min) creates
 * both gyms; /auth/register (3/min, separate counter) proves the
 * auto-link-on-signup behavior once. Every other session used here is
 * minted directly via JwtService, spending no login-throttle budget.
 */
describe('Members + Leads (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;

  const MARKER = 'e2e-ml-test';
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

    await prisma.member.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.lead.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.user.deleteMany({ where: { email: { contains: MARKER } } });
    await prisma.tenant.deleteMany({ where: { slug: { contains: MARKER } } });
  });

  afterAll(async () => {
    await prisma.member.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.lead.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
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

  async function createStaffUser(tenantId: string, role: 'MANAGER' | 'TRAINER' | 'FRONT_DESK', email: string): Promise<User> {
    const passwordHash = await passwordService.hash(KNOWN_PASSWORD);
    return prisma.user.create({
      data: { tenantId, email, passwordHash, firstName: 'Test', lastName: role, role, status: 'ACTIVE' },
    });
  }

  // -------------------------------------------------------------------
  // Two independent gyms, each with an owner, a trainer, and a manager.
  // -------------------------------------------------------------------
  let gymA: { tenantId: string; slug: string; ownerToken: string };
  let gymB: { tenantId: string; slug: string; ownerToken: string };
  let trainerA: User;
  let trainerAToken: string;
  let managerAToken: string;

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
  });

  // -------------------------------------------------------------------
  // Members: CRUD, search/filter, notes, trainer validation.
  // -------------------------------------------------------------------
  describe('Members CRUD', () => {
    let createdMemberId: string;

    it('creates a member', async () => {
      const response = await request(server())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Casey', lastName: 'Client', email: `${MARKER}-member-1@example.com`, phone: '+44 7700 900111' })
        .expect(201);

      expect(response.body.data.firstName).toBe('Casey');
      expect(response.body.data.status).toBe('ACTIVE');
      expect(response.body.data.notes).toEqual([]);
      createdMemberId = response.body.data.id;
    });

    it('rejects a trainerId that is not actually a trainer in this gym', async () => {
      const response = await request(server())
        .patch(`/api/v1/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ trainerId: gymA.tenantId }) // not a real user id at all, but definitely not a trainer
        .expect(404); // findByIdInTenant on a non-existent user id 404s before the role check even runs

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('assigns a valid trainer and retrieves the member with it populated', async () => {
      await request(server())
        .patch(`/api/v1/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ trainerId: trainerA.id })
        .expect(200);

      const response = await request(server())
        .get(`/api/v1/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);

      expect(response.body.data.trainer).toMatchObject({ id: trainerA.id });
    });

    it('adds a note and it appears embedded in the member detail, newest first', async () => {
      await request(server())
        .post(`/api/v1/members/${createdMemberId}/notes`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ body: 'First note' })
        .expect(201);
      await request(server())
        .post(`/api/v1/members/${createdMemberId}/notes`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ body: 'Second note' })
        .expect(201);

      const response = await request(server())
        .get(`/api/v1/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);

      expect(response.body.data.notes).toHaveLength(2);
      expect(response.body.data.notes[0].body).toBe('Second note');
      expect(response.body.data.notes[0].author).toMatchObject({ firstName: 'Alex' });
    });

    it('updates status and profile fields', async () => {
      const response = await request(server())
        .patch(`/api/v1/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ status: 'INACTIVE', addressLine: '12 Test Street' })
        .expect(200);

      expect(response.body.data.status).toBe('INACTIVE');
      expect(response.body.data.addressLine).toBe('12 Test Street');
    });

    it('searches/filters/paginates the members list', async () => {
      await request(server())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Riley', lastName: 'Regular', email: `${MARKER}-member-2@example.com` })
        .expect(201);

      const bySearch = await request(server())
        .get('/api/v1/members')
        .query({ search: 'Casey' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(bySearch.body.data.some((m: { firstName: string }) => m.firstName === 'Casey')).toBe(true);
      expect(bySearch.body.data.every((m: { firstName: string }) => m.firstName === 'Casey')).toBe(true);

      const byStatus = await request(server())
        .get('/api/v1/members')
        .query({ status: 'INACTIVE' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(byStatus.body.data.every((m: { status: string }) => m.status === 'INACTIVE')).toBe(true);

      const paged = await request(server())
        .get('/api/v1/members')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(paged.body.data).toHaveLength(1);
      expect(paged.body.meta.totalItems).toBeGreaterThanOrEqual(2);
    });

    it('rejects creating a member with no firstName', async () => {
      const response = await request(server())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ lastName: 'NoFirstName' })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------
  // Member portal self-access + the auto-link-on-registration behavior.
  // -------------------------------------------------------------------
  describe('Member portal (/members/me) and portal auto-link', () => {
    it('a user with no member profile gets 404 from /members/me', async () => {
      const response = await request(server())
        .get('/api/v1/members/me')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .expect(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('registering with an email matching a pending (unlinked) member links the two automatically', async () => {
      const pendingEmail = `${MARKER}-pending-member@example.com`;
      const pending = await prisma.member.create({
        data: { tenantId: gymA.tenantId, firstName: 'Pending', lastName: 'Walkin', email: pendingEmail },
      });
      expect(pending.userId).toBeNull();

      const registerResponse = await request(server())
        .post('/api/v1/auth/register')
        .send({ email: pendingEmail, password: KNOWN_PASSWORD, firstName: 'Pending', lastName: 'Walkin', tenantSlug: gymA.slug })
        .expect(201);

      const portalToken = registerResponse.body.data.accessToken as string;
      const meResponse = await request(server())
        .get('/api/v1/members/me')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(meResponse.body.data.id).toBe(pending.id);
      expect(meResponse.body.data.userId).toBe(registerResponse.body.data.user.id);
    });
  });

  // -------------------------------------------------------------------
  // Trainer scoping — "no access to business-wide data" for Members.
  // -------------------------------------------------------------------
  describe('Trainer scoping (members)', () => {
    let assignedMemberId: string;
    let unassignedMemberId: string;

    beforeAll(async () => {
      const assigned = await prisma.member.create({
        data: { tenantId: gymA.tenantId, firstName: 'Assigned', lastName: 'ToTrainer', trainerId: trainerA.id },
      });
      const unassigned = await prisma.member.create({
        data: { tenantId: gymA.tenantId, firstName: 'Unassigned', lastName: 'Elsewhere' },
      });
      assignedMemberId = assigned.id;
      unassignedMemberId = unassigned.id;
    });

    it("only returns the trainer's assigned members in the list, never others", async () => {
      const response = await request(server())
        .get('/api/v1/members')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .expect(200);

      const ids = (response.body.data as { id: string }[]).map((m) => m.id);
      expect(ids).toContain(assignedMemberId);
      expect(ids).not.toContain(unassignedMemberId);
    });

    it('403s a trainer reading a member not assigned to them by id', async () => {
      await request(server())
        .get(`/api/v1/members/${unassignedMemberId}`)
        .set('Authorization', `Bearer ${trainerAToken}`)
        .expect(403);
    });

    it('allows a trainer to read their own assigned member by id', async () => {
      await request(server())
        .get(`/api/v1/members/${assignedMemberId}`)
        .set('Authorization', `Bearer ${trainerAToken}`)
        .expect(200);
    });

    it('a trainer cannot create or update members at all (members:manage required)', async () => {
      await request(server())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ firstName: 'Should', lastName: 'Fail' })
        .expect(403);
    });
  });

  // -------------------------------------------------------------------
  // Leads: CRUD, lifecycle, follow-ups, notes.
  // -------------------------------------------------------------------
  describe('Leads lifecycle', () => {
    let leadId: string;

    it('creates a lead', async () => {
      const response = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Logan', lastName: 'Lead', email: `${MARKER}-lead-1@example.com`, source: 'WEBSITE', interest: 'Strength training' })
        .expect(201);

      expect(response.body.data.status).toBe('NEW');
      leadId = response.body.data.id;
    });

    it('rejects an invalid source', async () => {
      const response = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Bad', lastName: 'Source', source: 'CARRIER_PIGEON' })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects PATCHing status directly to CONVERTED', async () => {
      const response = await request(server())
        .patch(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ status: 'CONVERTED' })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('moves through CONTACTED -> FOLLOW_UP with a follow-up date', async () => {
      await request(server())
        .patch(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ status: 'CONTACTED' })
        .expect(200);

      const response = await request(server())
        .patch(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ status: 'FOLLOW_UP', nextFollowUpAt: '2026-06-01' })
        .expect(200);

      expect(response.body.data.status).toBe('FOLLOW_UP');
      expect(response.body.data.nextFollowUpAt).toContain('2026-06-01');
    });

    it('"which leads need attention today" — followUpDueBy finds it, an earlier date does not', async () => {
      const due = await request(server())
        .get('/api/v1/leads')
        .query({ followUpDueBy: '2026-06-02' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect((due.body.data as { id: string }[]).some((l) => l.id === leadId)).toBe(true);

      const notYetDue = await request(server())
        .get('/api/v1/leads')
        .query({ followUpDueBy: '2026-05-01' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect((notYetDue.body.data as { id: string }[]).some((l) => l.id === leadId)).toBe(false);
    });

    it('adds a note to the lead', async () => {
      await request(server())
        .post(`/api/v1/leads/${leadId}/notes`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ body: 'Called, left voicemail.' })
        .expect(201);

      const response = await request(server())
        .get(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data.notes).toHaveLength(1);
    });

    it('marks a different lead LOST with a reason, and a lost lead is excluded from the follow-up queue', async () => {
      const lostLead = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Lost', lastName: 'Cause', source: 'REFERRAL', nextFollowUpAt: '2026-01-01' })
        .expect(201);

      await request(server())
        .patch(`/api/v1/leads/${lostLead.body.data.id}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ status: 'LOST', lostReason: 'NOT_INTERESTED' })
        .expect(200);

      const dueList = await request(server())
        .get('/api/v1/leads')
        .query({ followUpDueBy: '2026-12-31' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect((dueList.body.data as { id: string }[]).some((l) => l.id === lostLead.body.data.id)).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // Conversion — the core "Lead -> Member" workflow.
  // -------------------------------------------------------------------
  describe('Lead conversion', () => {
    it('converts a lead with no matching existing member into a brand-new member', async () => {
      const lead = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Fresh', lastName: 'Convert', email: `${MARKER}-fresh-convert@example.com`, source: 'INSTAGRAM' })
        .expect(201);

      const converted = await request(server())
        .post(`/api/v1/leads/${lead.body.data.id}/convert`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ trainerId: trainerA.id })
        .expect(201);

      expect(converted.body.data.firstName).toBe('Fresh');
      expect(converted.body.data.convertedFromLead).toMatchObject({ id: lead.body.data.id, source: 'INSTAGRAM' });
      expect(converted.body.data.trainer).toMatchObject({ id: trainerA.id });

      const leadAfter = await request(server())
        .get(`/api/v1/leads/${lead.body.data.id}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(leadAfter.body.data.status).toBe('CONVERTED');
      expect(leadAfter.body.data.convertedAt).toEqual(expect.any(String));
      expect(leadAfter.body.data.convertedMemberId).toBe(converted.body.data.id);
    });

    it('converting a lead whose email matches an existing member links it instead of duplicating', async () => {
      const sharedEmail = `${MARKER}-dedup@example.com`;
      const existingMember = await prisma.member.create({
        data: { tenantId: gymA.tenantId, firstName: 'Already', lastName: 'AMember', email: sharedEmail },
      });

      const lead = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Old', lastName: 'Lead', email: sharedEmail, source: 'WALK_IN' })
        .expect(201);

      const countBefore = await prisma.member.count({ where: { tenantId: gymA.tenantId } });
      const converted = await request(server())
        .post(`/api/v1/leads/${lead.body.data.id}/convert`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(201);
      const countAfter = await prisma.member.count({ where: { tenantId: gymA.tenantId } });

      expect(converted.body.data.id).toBe(existingMember.id);
      expect(countAfter).toBe(countBefore); // no new member row was created
    });

    it('rejects converting an already-converted lead again', async () => {
      const lead = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Twice', lastName: 'Convert', email: `${MARKER}-twice@example.com`, source: 'WEBSITE' })
        .expect(201);
      await request(server())
        .post(`/api/v1/leads/${lead.body.data.id}/convert`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(201);

      const response = await request(server())
        .post(`/api/v1/leads/${lead.body.data.id}/convert`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects any further PATCH on a converted lead', async () => {
      const lead = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Frozen', lastName: 'AfterConvert', email: `${MARKER}-frozen@example.com`, source: 'WEBSITE' })
        .expect(201);
      await request(server())
        .post(`/api/v1/leads/${lead.body.data.id}/convert`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(201);

      const response = await request(server())
        .patch(`/api/v1/leads/${lead.body.data.id}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ interest: 'Too late' })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------
  // Cross-tenant isolation — the central ask of this phase.
  // -------------------------------------------------------------------
  describe('Cross-tenant isolation', () => {
    let gymAMemberId: string;
    let gymALeadId: string;

    beforeAll(async () => {
      const member = await prisma.member.create({
        data: { tenantId: gymA.tenantId, firstName: 'Only', lastName: 'InGymA' },
      });
      gymAMemberId = member.id;
      const lead = await prisma.lead.create({
        data: { tenantId: gymA.tenantId, firstName: 'Only', lastName: 'LeadInGymA', source: 'WEBSITE' },
      });
      gymALeadId = lead.id;
    });

    it("gym B's owner cannot read gym A's member by id", async () => {
      await request(server())
        .get(`/api/v1/members/${gymAMemberId}`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(404);
    });

    it("gym B's owner cannot update gym A's member", async () => {
      await request(server())
        .patch(`/api/v1/members/${gymAMemberId}`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ status: 'CANCELLED' })
        .expect(404);
    });

    it("gym A's member list never includes anything from gym B", async () => {
      const gymBMember = await prisma.member.create({
        data: { tenantId: gymB.tenantId, firstName: 'Only', lastName: 'InGymB' },
      });

      const response = await request(server())
        .get('/api/v1/members')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);

      const ids = (response.body.data as { id: string }[]).map((m) => m.id);
      expect(ids).not.toContain(gymBMember.id);
    });

    it("gym B's owner cannot read gym A's lead by id", async () => {
      await request(server())
        .get(`/api/v1/leads/${gymALeadId}`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .expect(404);
    });

    it("gym B's owner cannot convert gym A's lead", async () => {
      await request(server())
        .post(`/api/v1/leads/${gymALeadId}/convert`)
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({})
        .expect(404);
    });
  });

  // -------------------------------------------------------------------
  // Role authorization beyond tenant/trainer scoping.
  // -------------------------------------------------------------------
  describe('Role authorization', () => {
    it('a MANAGER (staff default: members:manage) can list and create members', async () => {
      await request(server()).get('/api/v1/members').set('Authorization', `Bearer ${managerAToken}`).expect(200);
      await request(server())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ firstName: 'ByManager', lastName: 'Created' })
        .expect(201);
    });

    it('a portal MEMBER (no staff role) cannot list members or leads at all', async () => {
      const memberUser = await createStaffUser(gymA.tenantId, 'FRONT_DESK' as never, `${MARKER}-plain-member@example.com`);
      await prisma.user.update({ where: { id: memberUser.id }, data: { role: 'MEMBER' } });
      const token = mintAccessToken({ ...memberUser, role: 'MEMBER' as never });

      await request(server()).get('/api/v1/members').set('Authorization', `Bearer ${token}`).expect(403);
      await request(server()).get('/api/v1/leads').set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('assigning a lead to a portal MEMBER (not staff) is rejected', async () => {
      const memberUser = await createStaffUser(gymA.tenantId, 'FRONT_DESK' as never, `${MARKER}-assignee-member@example.com`);
      await prisma.user.update({ where: { id: memberUser.id }, data: { role: 'MEMBER' } });

      const response = await request(server())
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ firstName: 'Bad', lastName: 'Assignment', source: 'WEBSITE', assignedToId: memberUser.id })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
