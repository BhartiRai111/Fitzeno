import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../generated/prisma/enums.js';

/**
 * The identity shape returned by every endpoint that exposes a user —
 * never the Prisma User model directly, so passwordHash can never
 * accidentally leak through a `return user` that forgets to strip it.
 */
export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ nullable: true }) lastLoginAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** Prisma's generated User shape has more (passwordHash) — this is what we accept in, everywhere. */
interface UserLike {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserResponse(user: UserLike): UserResponseDto {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
