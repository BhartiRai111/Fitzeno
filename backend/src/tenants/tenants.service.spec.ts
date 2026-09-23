import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantsService } from './tenants.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { Tenant, TenantSettings } from '../generated/prisma/client.js';

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    name: 'Test Gym',
    slug: 'test-gym',
    status: 'ACTIVE',
    tagline: null,
    description: null,
    logoUrl: null,
    phone: null,
    email: null,
    website: null,
    addressLine: null,
    city: null,
    region: null,
    postalCode: null,
    country: null,
    timezone: 'Europe/London',
    currency: 'GBP',
    locale: 'en-GB',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as Tenant;
}

function makeSettings(overrides: Partial<TenantSettings> = {}): TenantSettings {
  return {
    id: 'settings-1',
    tenantId: 'tenant-1',
    businessHours: [],
    membershipPolicy: {},
    paymentMethods: {},
    notificationPreferences: {},
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  } as TenantSettings;
}

describe('TenantsService', () => {
  let prisma: PrismaService;
  let service: TenantsService;

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: vi.fn(), update: vi.fn() },
      tenantSettings: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    } as unknown as PrismaService;

    service = new TenantsService(prisma);
  });

  describe('findCurrent', () => {
    it('returns the tenant', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant() as never);

      await expect(service.findCurrent('tenant-1')).resolves.toMatchObject({ id: 'tenant-1' });
    });

    it('throws NotFoundException when the tenant does not exist', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);

      await expect(service.findCurrent('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for a soft-deleted tenant', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant({ deletedAt: new Date() }) as never);

      await expect(service.findCurrent('tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('applies the given fields', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant() as never);
      vi.mocked(prisma.tenant.update).mockResolvedValue(makeTenant({ name: 'New Name' }) as never);

      await service.updateProfile('tenant-1', { name: 'New Name' });

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant-1' }, data: expect.objectContaining({ name: 'New Name' }) }),
      );
    });

    it('auto-transitions ONBOARDING to ACTIVE on the first profile save', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant({ status: 'ONBOARDING' }) as never);
      vi.mocked(prisma.tenant.update).mockResolvedValue(makeTenant({ status: 'ACTIVE' }) as never);

      await service.updateProfile('tenant-1', { name: 'New Name' });

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });

    it('does not touch status when the gym is already ACTIVE', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant({ status: 'ACTIVE' }) as never);
      vi.mocked(prisma.tenant.update).mockResolvedValue(makeTenant() as never);

      await service.updateProfile('tenant-1', { name: 'New Name' });

      const call = vi.mocked(prisma.tenant.update).mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(call.data).not.toHaveProperty('status');
    });
  });

  describe('updateStatus', () => {
    it('toggles between ACTIVE and INACTIVE', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant({ status: 'ACTIVE' }) as never);
      vi.mocked(prisma.tenant.update).mockResolvedValue(makeTenant({ status: 'INACTIVE' }) as never);

      const result = await service.updateStatus('tenant-1', 'INACTIVE');

      expect(result.status).toBe('INACTIVE');
    });

    it('lets an owner reactivate their own paused gym', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant({ status: 'INACTIVE' }) as never);
      vi.mocked(prisma.tenant.update).mockResolvedValue(makeTenant({ status: 'ACTIVE' }) as never);

      const result = await service.updateStatus('tenant-1', 'ACTIVE');

      expect(result.status).toBe('ACTIVE');
    });

    it('refuses to lift a platform-level suspension', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant({ status: 'SUSPENDED' }) as never);

      await expect(service.updateStatus('tenant-1', 'ACTIVE')).rejects.toThrow(ForbiddenException);
      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });
  });

  describe('getSettings', () => {
    it('returns the existing settings row', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant() as never);
      vi.mocked(prisma.tenantSettings.findUnique).mockResolvedValue(makeSettings() as never);

      await service.getSettings('tenant-1');

      expect(prisma.tenantSettings.create).not.toHaveBeenCalled();
    });

    it('creates a default-valued row when none exists yet', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant() as never);
      vi.mocked(prisma.tenantSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tenantSettings.create).mockResolvedValue(makeSettings() as never);

      await service.getSettings('tenant-1');

      expect(prisma.tenantSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1' }) }),
      );
    });
  });

  describe('updateSettings', () => {
    it('only updates the sections provided, leaving others untouched', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(makeTenant() as never);
      vi.mocked(prisma.tenantSettings.findUnique).mockResolvedValue(makeSettings() as never);
      vi.mocked(prisma.tenantSettings.update).mockResolvedValue(makeSettings() as never);

      await service.updateSettings('tenant-1', {
        paymentMethods: { card: true, upi: false, cash: true, bankTransfer: false },
      });

      const call = vi.mocked(prisma.tenantSettings.update).mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(call.data).toHaveProperty('paymentMethods');
      expect(call.data).not.toHaveProperty('businessHours');
      expect(call.data).not.toHaveProperty('membershipPolicy');
      expect(call.data).not.toHaveProperty('notificationPreferences');
    });
  });
});
