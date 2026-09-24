import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PermissionArea, PermissionLevel, UserRole } from '../generated/prisma/enums.js';
import { ROLE_DEFAULT_PERMISSIONS } from './role-permissions.const.js';

const LEVEL_RANK: Record<PermissionLevel, number> = {
  NONE: 0,
  VIEW: 1,
  MANAGE: 2,
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Role defaults merged with this user's stored overrides, if any. */
  async getEffectivePermissions(userId: string, role: UserRole): Promise<Record<PermissionArea, PermissionLevel>> {
    const overrides = await this.prisma.permissionOverride.findMany({ where: { userId } });
    return this.mergeOverrides(role, overrides);
  }

  /** Same computation, for a caller that already has the overrides loaded (avoids a redundant query). */
  mergeOverrides(
    role: UserRole,
    overrides: { area: PermissionArea; level: PermissionLevel }[],
  ): Record<PermissionArea, PermissionLevel> {
    const effective = { ...ROLE_DEFAULT_PERMISSIONS[role] };
    for (const override of overrides) {
      effective[override.area] = override.level;
    }
    return effective;
  }

  async hasPermission(userId: string, role: UserRole, area: PermissionArea, minLevel: PermissionLevel): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId, role);
    return LEVEL_RANK[effective[area]] >= LEVEL_RANK[minLevel];
  }

  levelSatisfies(level: PermissionLevel, minLevel: PermissionLevel): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
  }
}
