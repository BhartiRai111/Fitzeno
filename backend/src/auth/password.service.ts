import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

/** bcrypt's own hard limit — longer inputs are silently truncated, so DTOs enforce this too. */
export const MAX_PASSWORD_LENGTH = 72;
export const MIN_PASSWORD_LENGTH = 8;

const SALT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
