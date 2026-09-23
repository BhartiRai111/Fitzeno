import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/**
 * Deliberately narrower than the full TenantStatus enum — ONBOARDING is
 * system-managed (see TenantsService.updateProfile) and SUSPENDED is a
 * platform-level hold with no self-service endpoint at all, so neither is a
 * value an owner can set through this route. Only pausing/reactivating
 * their own gym is exposed here.
 */
export class UpdateTenantStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}
