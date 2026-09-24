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
 * Payments, Billing, Transactions, Invoices & Refunds — always against TWO
 * independent gyms, mirroring every other e2e suite's own pattern. Sessions
 * are minted directly via JwtService; only the two /auth/register-business
 * calls hit an HTTP auth endpoint.
 */
describe('Payments, Billing, Invoices & Refunds (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let passwordService: PasswordService;

  const MARKER = 'e2e-pay-test';
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
    await prisma.refund.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.invoice.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.transaction.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
    await prisma.invoiceCounter.deleteMany({ where: { tenant: { slug: { contains: MARKER } } } });
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
  ): Promise<{ user: User; memberId: string; token: string }> {
    const user = await createStaffUser(tenantId, 'FRONT_DESK', email);
    await prisma.user.update({ where: { id: user.id }, data: { role: 'MEMBER' } });
    const member = await prisma.member.create({
      data: { tenantId, userId: user.id, firstName: 'Test', lastName: 'Member', email, status: 'ACTIVE' },
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
    const trainerA = await createStaffUser(gymA.tenantId, 'TRAINER', `${MARKER}-trainer-a@example.com`);
    trainerAToken = mintAccessToken(trainerA);
    const frontDeskA = await createStaffUser(gymA.tenantId, 'FRONT_DESK', `${MARKER}-frontdesk-a@example.com`);
    frontDeskAToken = mintAccessToken(frontDeskA);

    memberA = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a1@example.com`);
    memberA2 = await createMemberWithLogin(gymA.tenantId, `${MARKER}-member-a2@example.com`);

    const plan = await request(server())
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${gymA.ownerToken}`)
      .send({ name: `${MARKER} Basic`, price: 69, billingPeriod: 'MONTHLY' })
      .expect(201);
    planAId = plan.body.data.id;
  });

  // -------------------------------------------------------------------
  // Recording payments: successful, failed, pending
  // -------------------------------------------------------------------
  let paidTxnId: string;

  describe('Recording payments', () => {
    it('a MEMBER cannot record a payment', async () => {
      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Should fail', amount: 10, method: 'CASH' })
        .expect(403);
    });

    it('staff records a manual payment — always immediately PAID, and generates an invoice', async () => {
      const response = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Cash at front desk', amount: 50, method: 'CASH' })
        .expect(201);
      expect(response.body.data.status).toBe('PAID');
      expect(response.body.data.amount).toBe(50);
      expect(response.body.data.invoiceNumber).toMatch(/^INV-\d{6}$/);
      expect(response.body.data.paidAt).not.toBeNull();
      paidTxnId = response.body.data.id;
    });

    it('a purchased membership with a paymentMethod creates a linked, PAID transaction and invoice', async () => {
      const response = await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA2.memberId, planId: planAId, paymentMethod: 'CARD' })
        .expect(201);
      const membershipId = response.body.data.id;

      const txns = await request(server())
        .get('/api/v1/transactions')
        .query({ memberId: memberA2.memberId, type: 'MEMBERSHIP_PURCHASE', limit: 10 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(txns.body.data.length).toBe(1);
      expect(txns.body.data[0].relatedMembershipId).toBe(membershipId);
      expect(txns.body.data[0].amount).toBe(69);
      expect(txns.body.data[0].status).toBe('PAID');
      expect(txns.body.data[0].invoiceNumber).toMatch(/^INV-\d{6}$/);
    });

    it('a comp/administrative membership with no paymentMethod creates no transaction', async () => {
      const freshMember = await createMemberWithLogin(gymA.tenantId, `${MARKER}-comp@example.com`);
      await request(server())
        .post('/api/v1/memberships')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: freshMember.memberId, planId: planAId })
        .expect(201);

      const txns = await request(server())
        .get('/api/v1/transactions')
        .query({ memberId: freshMember.memberId, limit: 10 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(txns.body.data.length).toBe(0);
    });

    it('rejects recording a payment for a member in a different gym', async () => {
      const gymBMember = await createMemberWithLogin(gymB.tenantId, `${MARKER}-gymb-member@example.com`);
      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: gymBMember.memberId, type: 'OTHER', description: 'Cross-gym', amount: 10, method: 'CASH' })
        .expect(404);
    });

    it('rejects an invalid amount (zero, negative, or too many decimal places)', async () => {
      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Bad amount', amount: 0, method: 'CASH' })
        .expect(400);
      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Bad amount', amount: 10.999, method: 'CASH' })
        .expect(400);
    });

    it('is idempotent: replaying the same idempotencyKey returns the original transaction instead of creating a duplicate', async () => {
      const key = `${MARKER}-idem-key-1`;
      const first = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Idempotent charge', amount: 25, method: 'CASH', idempotencyKey: key })
        .expect(201);

      const second = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Idempotent charge (retry)', amount: 25, method: 'CASH', idempotencyKey: key })
        .expect(201);

      expect(second.body.data.id).toBe(first.body.data.id);

      const count = await prisma.transaction.count({ where: { tenantId: gymA.tenantId, idempotencyKey: key } });
      expect(count).toBe(1);
    });
  });

  // -------------------------------------------------------------------
  // Pending payment lifecycle: mark-paid, mark-failed, cancel
  // -------------------------------------------------------------------
  describe('Pending payment lifecycle', () => {
    async function createPendingTransactionDirectly(memberId: string): Promise<string> {
      // The manual create endpoint always records PAID (matching the approved
      // frontend's RecordPaymentDialog) — a PENDING transaction only ever
      // arises from an online-gateway-style flow, which this phase doesn't
      // wire up yet. Insert one directly to exercise the transition endpoints.
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: gymA.tenantId } });
      const txn = await prisma.transaction.create({
        data: {
          tenantId: gymA.tenantId,
          memberId,
          type: 'OTHER',
          description: 'Pending online payment',
          amount: 30,
          currency: tenant.currency,
          method: 'ONLINE',
          status: 'PENDING',
        },
      });
      return txn.id;
    }

    it('confirms a pending payment as paid', async () => {
      const id = await createPendingTransactionDirectly(memberA.memberId);
      const response = await request(server())
        .post(`/api/v1/transactions/${id}/mark-paid`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(response.body.data.status).toBe('PAID');
      expect(response.body.data.paidAt).not.toBeNull();
    });

    it('marks a pending payment as failed, with a reason', async () => {
      const id = await createPendingTransactionDirectly(memberA.memberId);
      const response = await request(server())
        .post(`/api/v1/transactions/${id}/mark-failed`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ reason: 'Card declined' })
        .expect(201);
      expect(response.body.data.status).toBe('FAILED');
      expect(response.body.data.failureReason).toBe('Card declined');
    });

    it('cancels a still-pending payment', async () => {
      const id = await createPendingTransactionDirectly(memberA.memberId);
      const response = await request(server())
        .post(`/api/v1/transactions/${id}/cancel`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(201);
      expect(response.body.data.status).toBe('CANCELLED');
    });

    it('rejects transitioning a transaction that is already PAID', async () => {
      const response = await request(server())
        .post(`/api/v1/transactions/${paidTxnId}/mark-failed`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------
  // Invoices
  // -------------------------------------------------------------------
  describe('Invoices', () => {
    it('a staff-visible invoice mirrors its transaction — no separately stored status', async () => {
      const txn = await request(server()).get(`/api/v1/transactions/${paidTxnId}`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      const invoices = await request(server())
        .get('/api/v1/invoices')
        .query({ memberId: memberA.memberId, limit: 50 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      const invoice = (invoices.body.data as { invoiceNumber: string; transaction: { status: string } }[]).find(
        (i) => i.invoiceNumber === txn.body.data.invoiceNumber,
      );
      expect(invoice).toBeDefined();
      expect(invoice!.transaction.status).toBe('PAID');
    });

    it("a member can view their own invoice history and a single invoice's detail", async () => {
      const own = await request(server()).get('/api/v1/invoices/me').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(own.body.data.length).toBeGreaterThan(0);

      const invoiceId = own.body.data[0].id as string;
      const detail = await request(server()).get(`/api/v1/invoices/me/${invoiceId}`).set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(detail.body.data.id).toBe(invoiceId);
    });

    it("a member cannot view another member's invoice", async () => {
      const own = await request(server()).get('/api/v1/invoices/me').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      const invoiceId = own.body.data[0].id as string;

      await request(server()).get(`/api/v1/invoices/me/${invoiceId}`).set('Authorization', `Bearer ${memberA2.token}`).expect(403);
    });

    it('a MEMBER cannot use the staff invoice list/detail routes', async () => {
      await request(server()).get('/api/v1/invoices').set('Authorization', `Bearer ${memberA.token}`).expect(403);
    });
  });

  // -------------------------------------------------------------------
  // Refunds
  // -------------------------------------------------------------------
  describe('Refunds', () => {
    it('rejects refunding a transaction that is not paid', async () => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: gymA.tenantId } });
      const pending = await prisma.transaction.create({
        data: { tenantId: gymA.tenantId, memberId: memberA.memberId, type: 'OTHER', description: 'Pending', amount: 20, currency: tenant.currency, method: 'CASH', status: 'PENDING' },
      });
      const response = await request(server())
        .post(`/api/v1/transactions/${pending.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('issues a full refund and marks the transaction REFUNDED', async () => {
      const created = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'To be fully refunded', amount: 40, method: 'CASH' })
        .expect(201);

      const refund = await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ reason: 'Member requested' })
        .expect(201);
      expect(refund.body.data.amount).toBe(40);
      expect(refund.body.data.status).toBe('COMPLETED');

      const txn = await request(server()).get(`/api/v1/transactions/${created.body.data.id}`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(txn.body.data.status).toBe('REFUNDED');
      expect(txn.body.data.refundedAmount).toBe(40);
    });

    it('issues a partial refund and marks the transaction PARTIALLY_REFUNDED', async () => {
      const created = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'To be partially refunded', amount: 100, method: 'CARD' })
        .expect(201);

      const refund = await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ amount: 30, reason: 'Partial dissatisfaction' })
        .expect(201);
      expect(refund.body.data.amount).toBe(30);

      const txn = await request(server()).get(`/api/v1/transactions/${created.body.data.id}`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(txn.body.data.status).toBe('PARTIALLY_REFUNDED');
      expect(txn.body.data.refundedAmount).toBe(30);

      // A second partial refund can still be issued against the remaining amount.
      const secondRefund = await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ amount: 70 })
        .expect(201);
      expect(secondRefund.body.data.amount).toBe(70);

      const txnAfter = await request(server()).get(`/api/v1/transactions/${created.body.data.id}`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(txnAfter.body.data.status).toBe('REFUNDED');
      expect(txnAfter.body.data.refundedAmount).toBe(100);
    });

    it('rejects a refund amount exceeding the remaining refundable amount', async () => {
      const created = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Over-refund attempt', amount: 50, method: 'CASH' })
        .expect(201);

      const response = await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ amount: 999 })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      // A second refund attempt after the first already covered the full amount should also fail.
      await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(201);
      const secondAttempt = await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(400);
      expect(secondAttempt.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('a MEMBER cannot issue a refund', async () => {
      const created = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Member cannot refund this', amount: 20, method: 'CASH' })
        .expect(201);
      await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${memberA.token}`)
        .send({})
        .expect(403);
    });

    it('a refund is visible via the refunds list/detail endpoints', async () => {
      const created = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Refund list visibility', amount: 15, method: 'CASH' })
        .expect(201);
      const refund = await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .send({})
        .expect(201);

      const list = await request(server())
        .get('/api/v1/refunds')
        .query({ transactionId: created.body.data.id })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(list.body.data.length).toBe(1);
      expect(list.body.data[0].id).toBe(refund.body.data.id);

      const detail = await request(server()).get(`/api/v1/refunds/${refund.body.data.id}`).set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(detail.body.data.amount).toBe(15);
    });
  });

  // -------------------------------------------------------------------
  // Search & filtering
  // -------------------------------------------------------------------
  describe('Search and filtering', () => {
    it('filters transactions by status', async () => {
      const response = await request(server())
        .get('/api/v1/transactions')
        .query({ status: 'PAID', limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      for (const row of response.body.data as { status: string }[]) {
        expect(row.status).toBe('PAID');
      }
    });

    it('filters transactions by payment method', async () => {
      const response = await request(server())
        .get('/api/v1/transactions')
        .query({ method: 'CASH', limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      for (const row of response.body.data as { method: string }[]) {
        expect(row.method).toBe('CASH');
      }
    });

    it('filters transactions by amount range', async () => {
      const response = await request(server())
        .get('/api/v1/transactions')
        .query({ amountMin: 90, amountMax: 110, limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      for (const row of response.body.data as { amount: number }[]) {
        expect(row.amount).toBeGreaterThanOrEqual(90);
        expect(row.amount).toBeLessThanOrEqual(110);
      }
    });

    it('searches transactions by member name', async () => {
      const response = await request(server())
        .get('/api/v1/transactions')
        .query({ search: memberA.user.firstName, limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('paginates transaction results', async () => {
      const response = await request(server())
        .get('/api/v1/transactions')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.totalItems).toBeGreaterThan(1);
    });

    it('returns billing stats — revenue/pending/failed/refunded summary', async () => {
      const response = await request(server()).get('/api/v1/transactions/stats').set('Authorization', `Bearer ${gymA.ownerToken}`).expect(200);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          totalRevenue: expect.any(Number),
          paidCount: expect.any(Number),
          pendingAmount: expect.any(Number),
          failedCount: expect.any(Number),
          refundedAmount: expect.any(Number),
          revenueByType: expect.any(Array),
          revenueByMethod: expect.any(Array),
        }),
      );
      expect(response.body.data.totalRevenue).toBeGreaterThan(0);
      expect(response.body.data.refundedAmount).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------
  // A member's own payment history
  // -------------------------------------------------------------------
  describe("A member's own payment history", () => {
    it("a member sees only their own transactions via GET /transactions/me", async () => {
      const response = await request(server()).get('/api/v1/transactions/me').set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      for (const row of response.body.data as { member: { id: string } }[]) {
        expect(row.member.id).toBe(memberA.memberId);
      }
    });

    it("a member cannot view another member's transaction by id", async () => {
      await request(server()).get(`/api/v1/transactions/me/${paidTxnId}`).set('Authorization', `Bearer ${memberA2.token}`).expect(403);
    });

    it("a member can view their own transaction by id", async () => {
      const response = await request(server()).get(`/api/v1/transactions/me/${paidTxnId}`).set('Authorization', `Bearer ${memberA.token}`).expect(200);
      expect(response.body.data.id).toBe(paidTxnId);
    });
  });

  // -------------------------------------------------------------------
  // Cross-tenant isolation
  // -------------------------------------------------------------------
  describe('Cross-tenant isolation', () => {
    it("gym B's owner cannot read gym A's transaction by id", async () => {
      await request(server()).get(`/api/v1/transactions/${paidTxnId}`).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(404);
    });

    it("gym B's owner cannot mark-paid/refund gym A's transaction", async () => {
      await request(server()).post(`/api/v1/transactions/${paidTxnId}/mark-paid`).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(404);
      await request(server()).post(`/api/v1/transactions/${paidTxnId}/refund`).set('Authorization', `Bearer ${gymB.ownerToken}`).send({}).expect(404);
    });

    it("gym A's transaction list never includes gym B's transactions", async () => {
      const gymBMember = await createMemberWithLogin(gymB.tenantId, `${MARKER}-gymb-isolation@example.com`);
      const gymBTxn = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${gymB.ownerToken}`)
        .send({ memberId: gymBMember.memberId, type: 'OTHER', description: 'Gym B only', amount: 10, method: 'CASH' })
        .expect(201);

      const response = await request(server())
        .get('/api/v1/transactions')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      const ids = (response.body.data as { id: string }[]).map((t) => t.id);
      expect(ids).not.toContain(gymBTxn.body.data.id);
    });

    it("gym B's owner cannot read gym A's invoice by id", async () => {
      const invoices = await request(server())
        .get('/api/v1/invoices')
        .query({ memberId: memberA.memberId, limit: 10 })
        .set('Authorization', `Bearer ${gymA.ownerToken}`)
        .expect(200);
      const invoiceId = invoices.body.data[0].id as string;
      await request(server()).get(`/api/v1/invoices/${invoiceId}`).set('Authorization', `Bearer ${gymB.ownerToken}`).expect(404);
    });
  });

  // -------------------------------------------------------------------
  // Role authorization
  // -------------------------------------------------------------------
  describe('Role authorization', () => {
    it('FRONT_DESK (payments:manage by default) can record and refund payments', async () => {
      const created = await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${frontDeskAToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Front desk recorded', amount: 12, method: 'CASH' })
        .expect(201);
      await request(server())
        .post(`/api/v1/transactions/${created.body.data.id}/refund`)
        .set('Authorization', `Bearer ${frontDeskAToken}`)
        .send({})
        .expect(201);
    });

    it('TRAINER (payments:none by default) cannot view or record payments', async () => {
      await request(server()).get('/api/v1/transactions').set('Authorization', `Bearer ${trainerAToken}`).expect(403);
      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${trainerAToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Trainer should fail', amount: 10, method: 'CASH' })
        .expect(403);
    });

    it('a MANAGER (payments:manage by default) can view stats and record payments', async () => {
      await request(server()).get('/api/v1/transactions/stats').set('Authorization', `Bearer ${managerAToken}`).expect(200);
      await request(server())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ memberId: memberA.memberId, type: 'OTHER', description: 'Manager recorded', amount: 8, method: 'UPI' })
        .expect(201);
    });
  });
});
