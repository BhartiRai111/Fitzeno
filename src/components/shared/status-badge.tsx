import { Badge } from "@/components/ui/badge";
import type { MembershipStatus, LeadStatus, PaymentStatus, BookingStatus, StaffStatus, StockStatus, SaleStatus, ExpenseStatus } from "@/lib/data/types";

const membershipConfig: Record<MembershipStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  active: { label: "Active", variant: "success" },
  expiring: { label: "Expiring Soon", variant: "warning" },
  expired: { label: "Expired", variant: "danger" },
  frozen: { label: "Frozen", variant: "info" },
  trial: { label: "Trial", variant: "default" },
  cancelled: { label: "Cancelled", variant: "default" },
};

const leadConfig: Record<LeadStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "default" },
  "follow-up": { label: "Follow-up", variant: "warning" },
  "trial-booked": { label: "Trial Booked", variant: "success" },
  "trial-attended": { label: "Trial Attended", variant: "info" },
  converted: { label: "Converted", variant: "success" },
  lost: { label: "Lost", variant: "danger" },
};

const paymentConfig: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  failed: { label: "Failed", variant: "danger" },
  refunded: { label: "Refunded", variant: "info" },
};

const bookingConfig: Record<BookingStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  booked: { label: "Booked", variant: "success" },
  waitlisted: { label: "Waitlisted", variant: "warning" },
  attended: { label: "Attended", variant: "info" },
  cancelled: { label: "Cancelled", variant: "default" },
  "no-show": { label: "No-show", variant: "danger" },
};

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const config = membershipConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = leadConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config = bookingConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const staffConfig: Record<StaffStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  active: { label: "Active", variant: "success" },
  invited: { label: "Invited", variant: "info" },
  inactive: { label: "Inactive", variant: "default" },
};

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  const config = staffConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

const stockConfig: Record<StockStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  "in-stock": { label: "In Stock", variant: "success" },
  "low-stock": { label: "Low Stock", variant: "warning" },
  "out-of-stock": { label: "Out of Stock", variant: "danger" },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const config = stockConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

const saleConfig: Record<SaleStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  completed: { label: "Completed", variant: "success" },
  refunded: { label: "Refunded", variant: "info" },
  cancelled: { label: "Cancelled", variant: "default" },
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const config = saleConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

const expenseConfig: Record<ExpenseStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "default" },
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const config = expenseConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
