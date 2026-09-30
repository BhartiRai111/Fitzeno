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
 * Expenses & Financial Overview — always against TWO independent gyms,
 * mirroring every other e2e suite's own pattern. Sessions are minted
 * directly via JwtService; only the two /auth/register-business calls hit
 * an HTTP auth endpoint.
 */
describe('Expenses & Financial Overview (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;

  const MARKER = 'e2e-fin-test';
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
    await prisma.expense.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.expenseCounter.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.refund.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.invoice.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.transaction.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.invoiceCounter.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
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
    const member = await prisma.member.create({ data: { tenantId, userId: user.id, firstName: 'Test', lastName: 'Member', email, status: 'ACTIVE' } });
    return { user: { ...user, role: 'MEMBER' } as User, memberId: member.id, token: mintAccessToken({ ...user, role: 'MEMBER' as never }) };
  }

  function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  let gymA: { tenantId: string; slug: string; ownerToken: string };
  let gymB: { tenantId: string; slug: string; ownerToken: string };
  let managerAToken: string;
  let trainerAToken: string;
  let frontDeskAToken: string;
  let memberA: { user: User; memberId: string; token: string };

  beforeAll(async () => {
    const resA = await request(server())
      .post('/api/v1/auth/register-business')
      .send({ businessName: `${MARKER} Gym A`, ownerEmail: `${MARKER}-owner-a@example.com`, ownerPassword: KNOWN_PASSWORD, ownerFirstName: 'Alex', ownerLastName: 'OwnerA' });
    const tenantIdA = resA.body.data.user.tenantId as string;
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantIdA } });
    gymA = { tenantId: tenantIdA, slug: tenantA.slug, ownerToken: resA.body.data.accessToken };

    const resB = await request(server())
      .post('/api/v1/auth/register-business')
      .send({ businessName: `${MARKER} Gym B`, ownerEmail: `${MARKER}-owner-b@example.com`, ownerPassword: KNOWN_PASSWORD, ownerFirstName: 'Blair', ownerLastName: 'OwnerB' });
    const tenantIdB = resB.body.data.user.tenantId as string;
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantIdB } });
    gymB = { tenantId: tenantIdB, slug: tenantB.slug, ownerToken: resB.body.data.accessToken };

    const managerA = await createStaffUser(gymA.tenantId, 'MANAGER', `${MARKER}-manager-a@example.com`);
    managerAToken = mintAccessToken(managerA);
    const trainerA = await createStaffUser(gymA.tenantId, 'TRAINER', `${MARKER}-trainer-a@example.com`);
    trainerAToken = mintAccessToken(trainerA);
    const frontDeskA = await createStaffUser(gymA.tenantId, 'FRONT_DESK', `${MARKER}-frontdesk-a@example.com`);
    frontDeskAToken = mintAccessToken(frontDeskA);

    memberA = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a@example.com`);
  });

  // -------------------------------------------------------------------
  // Expense CRUD & role authorization
  // -------------------------------------------------------------------
  let rentExpenseId: string;

  describe('Recording expenses', () => {
    it('a MEMBER cannot record an expense', async () => {
      await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ title: 'Should fail', category: 'RENT', amount: 100, date: todayIso(), method: 'CASH' })
        .expect(403);
    });

    it('a TRAINER cannot record or view expenses (FINANCE:none by default)', async () => {
      await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ title: 'Should fail', category: 'RENT', amount: 100, date: todayIso(), method: 'CASH' })
        .expect(403);
      await request(server()).get('/api/v1/expenses').set('Authorization', `Bearer ${trainerAToken}`).expect(403);
    });

    it('a FRONT_DESK user cannot record or view expenses (FINANCE:none by default)', async () => {
      await request(server()).get('/api/v1/expenses').set('Authorization', `Bearer ${frontDeskAToken}`).expect(403);
    });

    it('an OWNER records an expense with a sequential EXP- reference', async () => {
      const response = await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Studio rent', category: 'RENT', amount: 3200, date: todayIso(), status: 'PAID', frequency: 'MONTHLY', method: 'BANK_TRANSFER', vendor: 'Riverside Property' })
        .expect(201);
      expect(response.body.data.reference).toMatch(/^EXP-\d{6}$/);
      expect(response.body.data.status).toBe('PAID');
      expect(response.body.data.recurring).toBe(true);
      expect(response.body.data.paidAt).not.toBeNull();
      rentExpenseId = response.body.data.id;
    });

    it('a MANAGER (FINANCE:manage by default) can also record expenses', async () => {
      const response = await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ title: 'Cleaning supplies', category: 'CLEANING', amount: 60, date: todayIso(), status: 'PAID', method: 'CARD' })
        .expect(201);
      expect(response.body.data.title).toBe('Cleaning supplies');
    });

    it('issues sequential references across expenses', async () => {
      const first = await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Seq A', category: 'OTHER', amount: 10, date: todayIso(), method: 'CASH' })
        .expect(201);
      const second = await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Seq B', category: 'OTHER', amount: 10, date: todayIso(), method: 'CASH' })
        .expect(201);
      const firstNum = Number(first.body.data.reference.replace('EXP-', ''));
      const secondNum = Number(second.body.data.reference.replace('EXP-', ''));
      expect(secondNum).toBe(firstNum + 1);
    });

    it('rejects an invalid amount', async () => {
      await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Bad amount', category: 'OTHER', amount: 0, date: todayIso(), method: 'CASH' })
        .expect(400);
    });
  });

  describe('Editing and the guarded lifecycle', () => {
    it('edits any field, including recurring metadata', async () => {
      const response = await request(server())
        .patch(`/api/v1/expenses/${rentExpenseId}`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ amount: 3300, notes: 'Rent increased for the new lease term.' })
        .expect(200);
      expect(response.body.data.amount).toBe(3300);
      expect(response.body.data.notes).toBe('Rent increased for the new lease term.');
    });

    it('marks a pending expense paid, then rejects marking it paid again', async () => {
      const created = await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Equipment', category: 'EQUIPMENT', amount: 500, date: todayIso(), dueDate: todayIso(), status: 'PENDING', method: 'BANK_TRANSFER' })
        .expect(201);

      const paid = await request(server())
        .post(`/api/v1/expenses/${created.body.data.id}/mark-paid`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(paid.body.data.status).toBe('PAID');
      expect(paid.body.data.paidAt).not.toBeNull();

      const response = await request(server())
        .post(`/api/v1/expenses/${created.body.data.id}/mark-paid`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('cancels a pending expense, rejects cancelling a paid one, then reopens it back to pending', async () => {
      const created = await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Ad campaign', category: 'MARKETING', amount: 250, date: todayIso(), status: 'PENDING', method: 'CARD' })
        .expect(201);

      const cancelled = await request(server())
        .post(`/api/v1/expenses/${created.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(cancelled.body.data.status).toBe('CANCELLED');

      await request(server()).post(`/api/v1/expenses/${rentExpenseId}/cancel`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(400);

      const reopened = await request(server())
        .post(`/api/v1/expenses/${created.body.data.id}/reopen`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(reopened.body.data.status).toBe('PENDING');
      expect(reopened.body.data.dueDate).not.toBeNull();
    });

    it('rejects reopening a non-cancelled expense', async () => {
      await request(server()).post(`/api/v1/expenses/${rentExpenseId}/reopen`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(400);
    });
  });

  describe('Search, filtering, and cross-tenant isolation', () => {
    it('filters by category and status', async () => {
      const response = await request(server())
        .get('/api/v1/expenses')
        .query({ category: 'RENT', status: 'PAID', limit: 50 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      for (const row of response.body.data as { category: string; status: string }[]) {
        expect(row.category).toBe('RENT');
        expect(row.status).toBe('PAID');
      }
    });

    it('filters by recurring=true', async () => {
      const response = await request(server())
        .get('/api/v1/expenses')
        .query({ recurring: 'true', limit: 50 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      for (const row of response.body.data as { recurring: boolean }[]) {
        expect(row.recurring).toBe(true);
      }
    });

    it('searches by title', async () => {
      const response = await request(server())
        .get('/api/v1/expenses')
        .query({ search: 'Studio rent' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("gym B cannot read or act on gym A's expense (cross-tenant 404)", async () => {
      await request(server()).get(`/api/v1/expenses/${rentExpenseId}`).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(404);
      await request(server()).post(`/api/v1/expenses/${rentExpenseId}/mark-paid`).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(404);
    });

    it("gym A's expense list never includes gym B's expenses", async () => {
      const gymBExpense = await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ title: 'Gym B rent', category: 'RENT', amount: 1000, date: todayIso(), status: 'PAID', method: 'CASH' })
        .expect(201);

      const response = await request(server()).get('/api/v1/expenses').query({ limit: 100 }).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      const ids = (response.body.data as { id: string }[]).map((e) => e.id);
      expect(ids).not.toContain(gymBExpense.body.data.id);
    });
  });

  // -------------------------------------------------------------------
  // Financial Overview
  // -------------------------------------------------------------------
  describe('Financial overview', () => {
    it('a TRAINER cannot view the financial overview', async () => {
      await request(server()).get('/api/v1/finance/overview').set('Authorization', `Bearer ${trainerAToken}`).expect(403);
    });

    it('rejects a custom period missing from/to', async () => {
      const response = await request(server())
        .get('/api/v1/finance/overview')
        .query({ preset: 'custom' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a custom period where from is after to', async () => {
      await request(server())
        .get('/api/v1/finance/overview')
        .query({ preset: 'custom', from: todayIso(), to: '2020-01-01' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(400);
    });

    it('combines today\'s revenue and expenses into a correct net result', async () => {
      const freshMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-overview-member@example.com`);

      const before = await request(server())
        .get('/api/v1/finance/overview')
        .query({ preset: 'today' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);

      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: freshMember.memberId, type: 'OTHER', description: 'Overview revenue', amount: 1000, method: 'CASH' })
        .expect(201);
      await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Overview expense', category: 'SUPPLIES', amount: 200, date: todayIso(), status: 'PAID', method: 'CASH' })
        .expect(201);
      // A pending expense must never count toward totalExpenses.
      await request(server())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ title: 'Not yet paid', category: 'SUPPLIES', amount: 999, date: todayIso(), status: 'PENDING', method: 'CASH' })
        .expect(201);

      const overview = await request(server())
        .get('/api/v1/finance/overview')
        .query({ preset: 'today' })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);

      // Exactly +1000 gross revenue and +200 paid expenses — the 999 pending expense contributes nothing to totalExpenses.
      expect(overview.body.data.grossRevenue).toBe(before.body.data.grossRevenue + 1000);
      expect(overview.body.data.totalExpenses).toBe(before.body.data.totalExpenses + 200);
      expect(overview.body.data.netResult).toBe(overview.body.data.netRevenue - overview.body.data.totalExpenses);
      expect(overview.body.data.pendingExpenses.pendingAmount).toBeGreaterThanOrEqual(999);
    });

    it('a refund reduces netRevenue and netResult, and a failed transaction never counts as revenue', async () => {
      const freshMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-refund-member@example.com`);

      const before = await request(server()).get('/api/v1/finance/overview').query({ preset: 'today' }).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);

      const txn = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: freshMember.memberId, type: 'OTHER', description: 'To be refunded', amount: 300, method: 'CARD' })
        .expect(201);
      await request(server())
        .post(`/api/v1/transactions/${txn.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ amount: 120, reason: 'Partial refund' })
        .expect(201);

      // A failed payment must never be counted as revenue.
      const failedPlan = await request(server())
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ name: `${MARKER} Failed Plan`, price: 500, billingPeriod: 'MONTHLY' })
        .expect(201);
      await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: freshMember.memberId, planId: failedPlan.body.data.id, paymentMethod: 'BANK_TRANSFER' })
        .expect(201);
      const relatedTxns = await request(server())
        .get('/api/v1/transactions')
        .query({ memberId: freshMember.memberId, status: 'PENDING', limit: 5 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      const pendingTxnId = relatedTxns.body.data[0]?.id;
      expect(pendingTxnId).toBeDefined();
      await request(server()).post(`/api/v1/transactions/${pendingTxnId}/mark-failed`).set('Authorization', `Bearer ${gymA.ownerToken}`).send({ reason: 'Declined' }).expect(201);

      const after = await request(server()).get('/api/v1/finance/overview').query({ preset: 'today' }).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);

      // +300 gross from the new transaction, -120 from its refund, and the 500 FAILED transaction contributes nothing.
      expect(after.body.data.grossRevenue).toBe(before.body.data.grossRevenue + 300);
      expect(after.body.data.refunds).toBe(before.body.data.refunds + 120);
      expect(after.body.data.netRevenue).toBe(before.body.data.netRevenue + 180);
    });

    it("gym A's overview never reflects gym B's revenue or expenses", async () => {
      const gymBMember = await createMemberWithLogin(gymB.tenantId, `${MARKER}-gymb-overview@example.com`);
      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ memberId: gymBMember.memberId, type: 'OTHER', description: 'Gym B revenue', amount: 5000, method: 'CASH' })
        .expect(201);

      const gymAOverview = await request(server()).get('/api/v1/finance/overview').query({ preset: 'today' }).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      const gymBOverview = await request(server()).get('/api/v1/finance/overview').query({ preset: 'today' }).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(200);

      expect(gymBOverview.body.data.grossRevenue).toBeGreaterThanOrEqual(5000);
      expect(gymAOverview.body.data.grossRevenue).toBeLessThan(gymBOverview.body.data.grossRevenue);
    });

    it('returns a month-bucketed trend ending with the current month', async () => {
      const response = await request(server()).get('/api/v1/finance/trend').query({ months: 3 }).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[2].month).toBe(todayIso().slice(0, 7));
      expect(response.body.data[2].net).toBe(response.body.data[2].revenue - response.body.data[2].expenses);
    });
  });
});
