import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_MEMBERSHIP_POLICY,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PAYMENT_METHODS,
} from '../src/tenants/tenant-defaults.const.js';

/**
 * Minimal dev-seed: one tenant (+ its settings row) and one owner account,
 * matching the gym profile already used by the frontend's mock data
 * (src/lib/data/gym.ts) so the two stay recognizably "the same gym" once
 * real API calls replace the mock data. ACTIVE, not ONBOARDING — this gym
 * is meant to look like an established one for local dev/demo purposes,
 * matching what AuthService.registerBusiness produces for a brand-new one.
 * Deliberately does not seed members/classes/etc. — that mock data is
 * still what the frontend renders in this phase, and a business-module
 * seed belongs with the module that defines those tables.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fitzeno-riverside' },
    update: {},
    create: {
      name: 'Fitzeno — Riverside District',
      slug: 'fitzeno-riverside',
      status: 'ACTIVE',
      tagline: 'Train with purpose.',
      description:
        'An independent strength and conditioning club built around coaching quality, honest programming, and a community that shows up.',
      phone: '+44 161 555 0148',
      email: 'hello@fitzeno.app',
      addressLine: '48 Riverside Walk',
      city: 'Manchester',
      postalCode: 'M3 4JG',
      country: 'United Kingdom',
      timezone: 'Europe/London',
      currency: 'GBP',
      locale: 'en-GB',
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      businessHours: DEFAULT_BUSINESS_HOURS,
      membershipPolicy: DEFAULT_MEMBERSHIP_POLICY,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    },
  });

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@fitzeno.app' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@fitzeno.app',
      passwordHash,
      firstName: 'Sam',
      lastName: 'Carter',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.log('Seeded tenant:', tenant.slug);
  console.log('Seeded owner user:', owner.email, '(password: ChangeMe123! — dev only)');

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
