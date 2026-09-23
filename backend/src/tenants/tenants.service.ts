import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantStatus } from '../generated/prisma/enums.js';
import type { Tenant, TenantSettings } from '../generated/prisma/client.js';
import type { UpdateTenantDto } from './dto/update-tenant.dto.js';
import type { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto.js';
import {
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_MEMBERSHIP_POLICY,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PAYMENT_METHODS,
} from './tenant-defaults.const.js';

/**
 * Every method here operates on "the caller's own tenant" — tenantId always
 * comes from `@CurrentUser().tenantId` (the JWT), never a client-supplied
 * parameter. There is deliberately no "get/update tenant by :id" route: a
 * resource that can only ever be reached as "mine" structurally cannot leak
 * across tenants, no ownership check required. Compare UsersService, which
 * DOES need a by-id lookup (staff managing OTHER users) and so carries an
 * explicit findByIdInTenant guard instead — the same isolation guarantee,
 * enforced the way each access pattern actually requires it.
 */
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('Gym not found.');
    }
    return tenant;
  }

  /**
   * A freshly created gym starts in ONBOARDING (see AuthService.registerBusiness)
   * purely as a UI signal — nothing here is gated on it. The first time the
   * owner saves real profile information, that's a reasonable, low-ceremony
   * definition of "onboarding complete": no separate "activate" endpoint the
   * frontend would otherwise have to remember to call.
   */
  async updateProfile(tenantId: string, dto: UpdateTenantDto): Promise<Tenant> {
    const current = await this.findCurrent(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...dto,
        ...(current.status === TenantStatus.ONBOARDING ? { status: TenantStatus.ACTIVE } : {}),
      },
    });
  }

  /**
   * Only reachable by an OWNER (enforced at the controller via `@Roles`),
   * and only between ACTIVE and INACTIVE — SUSPENDED is a platform-level
   * hold this endpoint can neither set nor lift (see UpdateTenantStatusDto).
   */
  async updateStatus(tenantId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Tenant> {
    const current = await this.findCurrent(tenantId);
    if (current.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException('This gym has been suspended. Contact support.');
    }
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  }

  /**
   * Defensive auto-create for any tenant that predates this table always
   * being created alongside its Tenant row (or a dev database that hasn't
   * re-run the seed) — every real creation path (registerBusiness, seed.ts)
   * creates this row eagerly, so this is a safety net, not the common path.
   */
  async getSettings(tenantId: string): Promise<TenantSettings> {
    await this.findCurrent(tenantId);
    const existing = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    if (existing) {
      return existing;
    }
    return this.prisma.tenantSettings.create({
      data: {
        tenantId,
        businessHours: DEFAULT_BUSINESS_HOURS,
        membershipPolicy: DEFAULT_MEMBERSHIP_POLICY,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      },
    });
  }

  /** Each section is independently optional — see UpdateTenantSettingsDto. */
  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto): Promise<TenantSettings> {
    await this.getSettings(tenantId); // ensures a row exists to update
    return this.prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        ...(dto.businessHours !== undefined
          ? { businessHours: dto.businessHours as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.membershipPolicy !== undefined
          ? { membershipPolicy: dto.membershipPolicy as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.paymentMethods !== undefined
          ? { paymentMethods: dto.paymentMethods as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.notificationPreferences !== undefined
          ? { notificationPreferences: dto.notificationPreferences as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
  }
}
