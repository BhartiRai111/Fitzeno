import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { BusinessHoursEntryDto } from './business-hours.dto.js';
import { MembershipPolicyDto } from './membership-policy.dto.js';
import { NotificationPreferencesDto } from './notification-preferences.dto.js';
import { PaymentMethodsDto } from './payment-methods.dto.js';

/**
 * Every section is optional and independently replaced — the Settings page
 * saves one tab at a time, so a PATCH here only ever sends the section(s)
 * being edited; sections left out keep their current stored value.
 */
export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ type: [BusinessHoursEntryDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursEntryDto)
  businessHours?: BusinessHoursEntryDto[];

  @ApiPropertyOptional({ type: MembershipPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MembershipPolicyDto)
  membershipPolicy?: MembershipPolicyDto;

  @ApiPropertyOptional({ type: PaymentMethodsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMethodsDto)
  paymentMethods?: PaymentMethodsDto;

  @ApiPropertyOptional({ type: NotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}
