import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { PermissionArea, PermissionLevel, UserRole, UserStatus } from '../generated/prisma/enums.js';
import type { User } from '../generated/prisma/client.js';
import { PaginatedResult, type PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { toUserResponse, type UserResponseDto } from './dto/user-response.dto.js';

export interface CreateUserInput {
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
}

export interface ListUsersFilter {
  role?: UserRole;
  status?: UserStatus;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  /** Email is globally unique (one login identity per address, not per-tenant) — used by login/register. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /** Used by JwtStrategy — no tenant context available yet at that point in the request. */
  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    return this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role,
        status: input.status ?? UserStatus.ACTIVE,
      },
    });
  }

  /**
   * Staff invites create a real row immediately (so it shows up in the team
   * list right away, status INVITED) but with a password nobody knows —
   * the invited person can only ever gain access by completing the
   * password-reset-token flow AuthService issues alongside this. Generating
   * and discarding a random password, rather than a nullable passwordHash
   * column, keeps every other query and the login path free of a
   * "what if there's no password yet" branch.
   */
  async createInvite(input: Omit<CreateUserInput, 'passwordHash' | 'status'>): Promise<User> {
    const throwawayPassword = randomBytes(32).toString('base64url');
    const passwordHash = await this.passwordService.hash(throwawayPassword);
    return this.create({ ...input, passwordHash, status: UserStatus.INVITED });
  }

  touchLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  setPasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async updateProfile(
    tenantId: string,
    id: string,
    data: { firstName?: string; lastName?: string; phone?: string | null },
  ): Promise<User> {
    await this.findByIdInTenant(tenantId, id);
    return this.prisma.user.update({ where: { id }, data });
  }

  async setStatus(tenantId: string, id: string, status: UserStatus): Promise<User> {
    const target = await this.findByIdInTenant(tenantId, id);
    if (target.role === UserRole.OWNER && status !== UserStatus.ACTIVE) {
      await this.assertNotLastActiveOwner(tenantId, id);
    }
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async setRole(tenantId: string, id: string, role: UserRole): Promise<User> {
    const target = await this.findByIdInTenant(tenantId, id);
    if (target.role === UserRole.OWNER && role !== UserRole.OWNER) {
      await this.assertNotLastActiveOwner(tenantId, id);
    }
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  /** Prevents a tenant from ending up with zero active owners — no one left who could restore access. */
  private async assertNotLastActiveOwner(tenantId: string, excludingUserId: string): Promise<void> {
    const otherActiveOwners = await this.prisma.user.count({
      where: {
        tenantId,
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        id: { not: excludingUserId },
      },
    });
    if (otherActiveOwners === 0) {
      throw new BadRequestException('A gym must always have at least one active owner.');
    }
  }

  async list(
    tenantId: string,
    query: PaginationQueryDto,
    filter: ListUsersFilter = {},
  ): Promise<PaginatedResult<UserResponseDto>> {
    const where = {
      tenantId,
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const sortableFields = ['createdAt', 'email', 'firstName', 'lastName', 'role', 'status'];
    const sortBy = sortableFields.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new PaginatedResult(items.map(toUserResponse), totalItems, query.page, query.limit);
  }

  async getPermissionOverrides(
    tenantId: string,
    userId: string,
  ): Promise<{ area: PermissionArea; level: PermissionLevel }[]> {
    await this.findByIdInTenant(tenantId, userId);
    return this.prisma.permissionOverride.findMany({
      where: { userId },
      select: { area: true, level: true },
    });
  }

  /** Replaces the full override set for a user with the given list — an empty list clears back to role defaults. */
  async setPermissionOverrides(
    tenantId: string,
    userId: string,
    overrides: { area: PermissionArea; level: PermissionLevel }[],
  ): Promise<void> {
    await this.findByIdInTenant(tenantId, userId);
    await this.prisma.$transaction([
      this.prisma.permissionOverride.deleteMany({ where: { userId } }),
      ...(overrides.length > 0
        ? [
            this.prisma.permissionOverride.createMany({
              data: overrides.map((o) => ({ userId, area: o.area, level: o.level })),
            }),
          ]
        : []),
    ]);
  }
}
