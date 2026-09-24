import type { Trainer, StaffMember, StaffAccessRole, StaffStatus, PermissionArea, PermissionLevel } from "@/lib/data/types";

export interface TeamMember {
  id: string;
  kind: "trainer" | "staff";
  name: string;
  initials: string;
  title: string;
  accessRole: StaffAccessRole;
  email: string;
  phone: string;
  status: StaffStatus;
  joinedOn: string;
  permissionOverrides: Partial<Record<PermissionArea, PermissionLevel>>;
  recentActivity: string[];
  specialties?: string[];
  bio?: string;
  rating?: number;
  reviewCount?: number;
  yearsExperience?: number;
}

export function trainerToTeamMember(t: Trainer): TeamMember {
  return {
    id: t.id,
    kind: "trainer",
    name: t.name,
    initials: t.initials,
    title: t.role,
    accessRole: "trainer",
    email: t.email ?? "—",
    phone: t.phone ?? "—",
    status: t.status ?? "active",
    joinedOn: t.joinedOn ?? "2020-01-01",
    permissionOverrides: t.permissionOverrides ?? {},
    recentActivity: [],
    specialties: t.specialties,
    bio: t.bio,
    rating: t.rating,
    reviewCount: t.reviewCount,
    yearsExperience: t.yearsExperience,
  };
}

export function staffToTeamMember(s: StaffMember): TeamMember {
  return {
    id: s.id,
    kind: "staff",
    name: s.name,
    initials: s.initials,
    title: s.title,
    accessRole: s.accessRole,
    email: s.email,
    phone: s.phone,
    status: s.status,
    joinedOn: s.joinedOn,
    permissionOverrides: s.permissionOverrides,
    recentActivity: s.recentActivity,
  };
}
