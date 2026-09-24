import { ApiProperty } from '@nestjs/swagger';
import type { TenantSettings } from '../../generated/prisma/client.js';
import { BusinessHoursEntryDto } from './business-hours.dto.js';
import { MembershipPolicyDto } from './membership-policy.dto.js';
import { NotificationPreferencesDto } from './notification-preferences.dto.js';
import { PaymentMethodsDto } from './payment-methods.dto.js';

export class TenantSettingsResponseDto {
  @ApiProperty({ type: [BusinessHoursEntryDto] }) businessHours!: BusinessHoursEntryDto[];
  @ApiProperty({ type: MembershipPolicyDto }) membershipPolicy!: MembershipPolicyDto;
  @ApiProperty({ type: PaymentMethodsDto }) paymentMethods!: PaymentMethodsDto;
  @ApiProperty({ type: NotificationPreferencesDto }) notificationPreferences!: NotificationPreferencesDto;
  @ApiProperty() updatedAt!: Date;
}

/**
 * The JSON columns are stored exactly as their validated DTOs shape them
 * (every write goes through UpdateTenantSettingsDto), so this is a type
 * assertion over already-trusted data, not a runtime re-validation.
 */
export function toTenantSettingsResponse(settings: TenantSettings): TenantSettingsResponseDto {
  return {
    businessHours: settings.businessHours as unknown as BusinessHoursEntryDto[],
    membershipPolicy: settings.membershipPolicy as unknown as MembershipPolicyDto,
    paymentMethods: settings.paymentMethods as unknown as PaymentMethodsDto,
    notificationPreferences: settings.notificationPreferences as unknown as NotificationPreferencesDto,
    updatedAt: settings.updatedAt,
  };
}
