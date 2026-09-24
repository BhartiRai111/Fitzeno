import { apiFetch } from "./client";

export interface BackendTenant {
  id: string;
  name: string;
  slug: string;
  status: "ONBOARDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  addressLine: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHoursEntry {
  day: string;
  time: string;
}

export interface MembershipPolicy {
  freezesPerYear?: number;
  maxFreezeDurationDays?: number;
  cancellationNoticeDays?: number;
  renewalReminderDaysBefore?: number[];
}

export interface PaymentMethodsSettings {
  card: boolean;
  upi: boolean;
  cash: boolean;
  bankTransfer: boolean;
}

export interface TenantNotificationChannels {
  booking: boolean;
  renewal: boolean;
  payment: boolean;
  attendance: boolean;
  announcement: boolean;
  promotion: boolean;
}

export interface StaffNotificationChannels {
  booking: boolean;
  class: boolean;
  attendance: boolean;
  announcement: boolean;
}

export interface BackendTenantSettings {
  businessHours: BusinessHoursEntry[];
  membershipPolicy: MembershipPolicy;
  paymentMethods: PaymentMethodsSettings;
  notificationPreferences: { member: TenantNotificationChannels; staff: StaffNotificationChannels };
  updatedAt: string;
}

export interface UpdateTenantInput {
  name?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export async function fetchCurrentTenant(): Promise<BackendTenant> {
  return apiFetch<BackendTenant>("/tenants/me");
}

export async function updateCurrentTenant(input: UpdateTenantInput): Promise<BackendTenant> {
  return apiFetch<BackendTenant>("/tenants/me", { method: "PATCH", body: input });
}

export async function fetchCurrentTenantSettings(): Promise<BackendTenantSettings> {
  return apiFetch<BackendTenantSettings>("/tenants/me/settings");
}

export async function updateCurrentTenantSettings(
  input: Partial<Pick<BackendTenantSettings, "businessHours" | "membershipPolicy" | "paymentMethods" | "notificationPreferences">>,
): Promise<BackendTenantSettings> {
  return apiFetch<BackendTenantSettings>("/tenants/me/settings", { method: "PATCH", body: input });
}
