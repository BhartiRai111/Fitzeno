import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  Dumbbell,
  Wallet,
  ClipboardCheck,
  Tag,
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
    items: [{ label: "Overview", href: "/owner", icon: LayoutDashboard }],
  },
  {
    title: "People",
    items: [
      { label: "Members", href: "/owner/members", icon: Users },
      { label: "Leads & Enquiries", href: "/owner/leads", icon: UserPlus },
      { label: "Trainers & Staff", href: "/owner/staff", icon: UserCircle },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Classes & Schedule", href: "/owner/classes", icon: CalendarDays },
      { label: "Attendance", href: "/owner/attendance", icon: ClipboardCheck },
      { label: "Offers & Promotions", href: "/owner/offers", icon: Tag },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Payments & Revenue", href: "/owner/payments", icon: Wallet },
      { label: "Reports & Analytics", href: "/owner/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Workspace",
    items: [{ label: "Settings", href: "/owner/settings", icon: Settings }],
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
