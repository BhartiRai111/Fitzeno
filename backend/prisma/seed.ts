import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * Minimal dev-seed: one tenant and one owner account, matching the gym
 * profile already used by the frontend's mock data (src/lib/data/gym.ts)
 * so the two stay recognizably "the same gym" once real API calls replace
 * the mock data. Deliberately does not seed members/classes/etc. — that
 * mock data is still what the frontend renders in this phase, and a
 * business-module seed belongs with the module that defines those tables.
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
      timezone: 'Europe/London',
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
