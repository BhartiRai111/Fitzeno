import { Injectable } from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

/**
 * Opaque, high-entropy tokens for refresh and password-reset flows — not
 * JWTs, because these need to be revocable (a database row to delete/mark
 * used) rather than just time-limited. Only a SHA-256 hash of the token is
 * ever persisted; the raw value exists only in the httpOnly cookie (refresh)
 * or the one-time email link (password reset) and briefly in memory while
 * issuing it. SHA-256 (not bcrypt) is deliberate here: these tokens are
 * already 256 bits of random entropy, not a human-chosen low-entropy
 * secret, so a slow KDF adds cost without adding real protection — the
 * thing defending them is the hash being unguessable from the token, not
 * the hash being slow to brute-force.
 */
@Injectable()
export class TokenService {
  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /** Constant-time comparison of two hashes, so a timing side-channel can't leak how much of a guess was correct. */
  hashesMatch(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'hex');
    const bufferB = Buffer.from(b, 'hex');
    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
  }
}
