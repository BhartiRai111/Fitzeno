import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Runs `fn` inside a Serializable-isolation transaction, retrying a bounded
 * number of times when Postgres aborts it for a serialization failure
 * (Prisma error code P2034) — the correct, expected outcome of two
 * Serializable transactions racing over the same rows, not a real error.
 *
 * Used wherever capacity/waitlist-style accounting must stay correct under
 * concurrent requests (see ClassBookingsService) without resorting to raw
 * SQL row locking: Serializable isolation lets Postgres itself detect the
 * conflict, and retrying the (idempotent, side-effect-free-until-commit)
 * callback is simpler and just as correct at this scale.
 */
export async function runSerializableTransaction<T>(
  prisma: PrismaService,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { maxRetries?: number } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const isSerializationFailure =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!isSerializationFailure || attempt === maxRetries) {
        throw error;
      }
    }
  }

  // Unreachable — the loop above always either returns or throws.
  throw new Error('runSerializableTransaction: exhausted retries without resolving.');
}
