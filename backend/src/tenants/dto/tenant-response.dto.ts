import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '../../generated/prisma/enums.js';
import type { Tenant } from '../../generated/prisma/client.js';

export class TenantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: TenantStatus }) status!: TenantStatus;

  @ApiProperty({ nullable: true }) tagline!: string | null;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true }) logoUrl!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) website!: string | null;
  @ApiProperty({ nullable: true }) addressLine!: string | null;
  @ApiProperty({ nullable: true }) city!: string | null;
  @ApiProperty({ nullable: true }) region!: string | null;
  @ApiProperty({ nullable: true }) postalCode!: string | null;
  @ApiProperty({ nullable: true }) country!: string | null;

  @ApiProperty() timezone!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() locale!: string;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export function toTenantResponse(tenant: Tenant): TenantResponseDto {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    tagline: tenant.tagline,
    description: tenant.description,
    logoUrl: tenant.logoUrl,
    phone: tenant.phone,
    email: tenant.email,
    website: tenant.website,
    addressLine: tenant.addressLine,
    city: tenant.city,
    region: tenant.region,
    postalCode: tenant.postalCode,
    country: tenant.country,
    timezone: tenant.timezone,
    currency: tenant.currency,
    locale: tenant.locale,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}
