import {
  CalendarCheck,
  ListPlus,
  Dumbbell,
  RefreshCcw,
  CreditCard,
  Activity,
  UserRoundPlus,
  UserCog,
  Megaphone,
  Tag,
  Sparkles,
  PackageSearch,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import type { NotificationCategory, NotificationPriority } from "@/lib/data/types";

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  className: string;
}

export const CATEGORY_META: Record<NotificationCategory, CategoryMeta> = {
  booking: { label: "Bookings", icon: CalendarCheck, className: "bg-info-tint text-info" },
  waitlist: { label: "Waitlist", icon: ListPlus, className: "bg-info-tint text-info" },
  class: { label: "Classes", icon: Dumbbell, className: "bg-warning-tint text-warning" },
  renewal: { label: "Renewals", icon: RefreshCcw, className: "bg-warning-tint text-warning" },
  payment: { label: "Payments", icon: CreditCard, className: "bg-success-tint text-success" },
  attendance: { label: "Attendance", icon: Activity, className: "bg-accent text-accent-foreground" },
  lead: { label: "Leads", icon: UserRoundPlus, className: "bg-success-tint text-success" },
  staff: { label: "Staff", icon: UserCog, className: "bg-accent text-accent-foreground" },
  announcement: { label: "Announcements", icon: Megaphone, className: "bg-primary/10 text-primary" },
  promotion: { label: "Offers", icon: Tag, className: "bg-primary/10 text-primary" },
  system: { label: "Updates", icon: Sparkles, className: "bg-accent text-accent-foreground" },
  inventory: { label: "Inventory", icon: PackageSearch, className: "bg-warning-tint text-warning" },
  expense: { label: "Expenses", icon: Receipt, className: "bg-danger-tint text-danger" },
};

export const PRIORITY_META: Record<NotificationPriority, { label: string; dotClassName: string; badgeClassName: string }> = {
  high: { label: "High priority", dotClassName: "bg-danger", badgeClassName: "bg-danger-tint text-danger" },
  medium: { label: "Medium priority", dotClassName: "bg-primary", badgeClassName: "bg-accent text-accent-foreground" },
  low: { label: "Low priority", dotClassName: "bg-muted-foreground/50", badgeClassName: "bg-muted text-muted-foreground" },
};
