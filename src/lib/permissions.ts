import {
  Users,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Wallet,
  ShoppingBag,
  PiggyBank,
  BarChart3,
  UserCog,
  Megaphone,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { PermissionArea, PermissionLevel, StaffAccessRole } from "@/lib/data/types";

export interface PermissionAreaMeta {
  key: PermissionArea;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const PERMISSION_AREAS: PermissionAreaMeta[] = [
  { key: "members", label: "Members & Leads", description: "Member profiles, contact info, and lead follow-up.", icon: Users },
  { key: "bookings", label: "Classes & Bookings", description: "Class schedule, bookings, and waitlists.", icon: CalendarDays },
  { key: "attendance", label: "Attendance & Check-in", description: "Checking members in and marking class attendance.", icon: ClipboardCheck },
  { key: "memberships", label: "Memberships", description: "Plans, renewals, freezes, and cancellations.", icon: CreditCard },
  { key: "payments", label: "Payments & Billing", description: "Recording payments, refunds, and viewing transactions.", icon: Wallet },
  { key: "store", label: "Store & Inventory", description: "Point of sale, product catalog, and stock management.", icon: ShoppingBag },
  { key: "finance", label: "Finances & Expenses", description: "Business expenses, profit and loss, and financial overview.", icon: PiggyBank },
  { key: "reports", label: "Reports & Analytics", description: "Revenue, growth, and business performance data.", icon: BarChart3 },
  { key: "staff", label: "Staff & Permissions", description: "Inviting staff, assigning roles, and access control.", icon: UserCog },
  { key: "announcements", label: "Announcements", description: "Sending broadcast messages to members or staff.", icon: Megaphone },
  { key: "settings", label: "Gym Settings", description: "Business profile, hours, and system-wide configuration.", icon: Settings },
];

export const ROLE_LABELS: Record<StaffAccessRole, string> = {
  owner: "Owner",
  manager: "Manager",
  trainer: "Trainer",
  "front-desk": "Front Desk",
};

export const ROLE_BADGE_VARIANT: Record<StaffAccessRole, "primary" | "info" | "warning" | "default"> = {
  owner: "primary",
  manager: "info",
  trainer: "warning",
  "front-desk": "default",
};

export const ROLE_DESCRIPTIONS: Record<StaffAccessRole, string> = {
  owner: "Full access to every area — account holder, not editable.",
  manager: "Runs daily operations across the gym, but can't change system settings or staff access.",
  trainer: "Sees their own classes, sessions, and assigned members. No access to business-wide data.",
  "front-desk": "Handles members, check-ins, and payments at the desk. No access to reports or settings.",
};

const FULL_ACCESS: Record<PermissionArea, PermissionLevel> = {
  members: "manage",
  bookings: "manage",
  attendance: "manage",
  memberships: "manage",
  payments: "manage",
  store: "manage",
  finance: "manage",
  reports: "manage",
  staff: "manage",
  announcements: "manage",
  settings: "manage",
};

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffAccessRole, Record<PermissionArea, PermissionLevel>> = {
  owner: FULL_ACCESS,
  manager: {
    members: "manage",
    bookings: "manage",
    attendance: "manage",
    memberships: "manage",
    payments: "manage",
    store: "manage",
    finance: "manage",
    reports: "view",
    staff: "view",
    announcements: "manage",
    settings: "view",
  },
  trainer: {
    members: "view",
    bookings: "manage",
    attendance: "manage",
    memberships: "none",
    payments: "none",
    store: "none",
    finance: "none",
    reports: "none",
    staff: "none",
    announcements: "none",
    settings: "none",
  },
  "front-desk": {
    members: "manage",
    bookings: "manage",
    attendance: "manage",
    memberships: "view",
    payments: "manage",
    store: "manage",
    finance: "none",
    reports: "none",
    staff: "none",
    announcements: "none",
    settings: "none",
  },
};

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "No access",
  view: "Can view",
  manage: "Can manage",
};

/** Merges a role's default permissions with any per-person overrides. */
export function getEffectivePermissions(
  role: StaffAccessRole,
  overrides: Partial<Record<PermissionArea, PermissionLevel>> = {},
  roleDefaults: Record<StaffAccessRole, Record<PermissionArea, PermissionLevel>> = ROLE_DEFAULT_PERMISSIONS
): Record<PermissionArea, PermissionLevel> {
  return { ...roleDefaults[role], ...overrides };
}

export function isCustomized(overrides: Partial<Record<PermissionArea, PermissionLevel>> = {}): boolean {
  return Object.keys(overrides).length > 0;
}

/** Maps owner-side nav hrefs to the permission area that gates them. `null` = always visible (personal, not business-data). */
export const NAV_AREA_MAP: Record<string, PermissionArea | null> = {
  "/owner": null,
  "/owner/members": "members",
  "/owner/leads": "members",
  "/owner/staff": "staff",
  "/owner/memberships": "memberships",
  "/owner/classes": "bookings",
  "/owner/attendance": "attendance",
  "/owner/payments": "payments",
  "/owner/store": "store",
  "/owner/finances": "finance",
  "/owner/reports": "reports",
  "/owner/notifications": null,
  "/owner/settings": "settings",
};
