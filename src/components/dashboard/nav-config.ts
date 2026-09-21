import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  CalendarDays,
  Dumbbell,
  Wallet,
  ClipboardCheck,
  BarChart3,
  Settings,
  QrCode,
  CalendarCheck,
  TrendingUp,
  Bell,
  UserCircle,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const ownerNavSections: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/owner", icon: LayoutDashboard }],
  },
  {
    title: "People",
    items: [
      { label: "Members", href: "/owner/members", icon: Users },
      { label: "Leads", href: "/owner/leads", icon: UserPlus },
      { label: "Trainers & Staff", href: "/owner/staff", icon: UserCircle },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Memberships", href: "/owner/memberships", icon: CreditCard },
      { label: "Classes & Schedule", href: "/owner/classes", icon: CalendarDays },
      { label: "Attendance", href: "/owner/attendance", icon: ClipboardCheck },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Payments & Billing", href: "/owner/payments", icon: Wallet },
      { label: "Reports & Analytics", href: "/owner/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Notifications", href: "/owner/notifications", icon: Bell },
      { label: "Settings", href: "/owner/settings", icon: Settings },
    ],
  },
];

export const memberNavItems: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Classes", href: "/portal/classes", icon: Dumbbell },
  { label: "My Bookings", href: "/portal/bookings", icon: CalendarCheck },
  { label: "Membership", href: "/portal/membership", icon: Wallet },
  { label: "Check-in", href: "/portal/check-in", icon: QrCode },
  { label: "Progress", href: "/portal/progress", icon: TrendingUp },
  { label: "Notifications", href: "/portal/notifications", icon: Bell },
  { label: "Profile", href: "/portal/profile", icon: UserCircle },
];
