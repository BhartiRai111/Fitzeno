import type { Payment } from "./types";

export const payments: Payment[] = [
  { id: "p-1", memberName: "Aisha Patel", memberInitials: "AP", amount: 69, method: "Card", status: "paid", plan: "Growth", date: "2026-09-14", invoiceId: "INV-10241" },
  { id: "p-2", memberName: "Tom Bradley", memberInitials: "TB", amount: 119, method: "Card", status: "paid", plan: "Elite", date: "2026-09-02", invoiceId: "INV-10238" },
  { id: "p-3", memberName: "Grace Kim", memberInitials: "GK", amount: 39, method: "UPI", status: "failed", plan: "Basic", date: "2026-09-08", invoiceId: "INV-10240" },
  { id: "p-4", memberName: "Ravi Shankar", memberInitials: "RS", amount: 69, method: "Bank Transfer", status: "paid", plan: "Growth", date: "2026-08-30", invoiceId: "INV-10233" },
  { id: "p-5", memberName: "Isabelle Moreau", memberInitials: "IM", amount: 119, method: "Card", status: "paid", plan: "Elite", date: "2026-09-19", invoiceId: "INV-10247" },
  { id: "p-6", memberName: "Hannah Wu", memberInitials: "HW", amount: 69, method: "Card", status: "pending", plan: "Growth", date: "2026-09-21", invoiceId: "INV-10249" },
  { id: "p-7", memberName: "Oliver Bennett", memberInitials: "OB", amount: 119, method: "Cash", status: "paid", plan: "Elite", date: "2026-09-01", invoiceId: "INV-10236" },
  { id: "p-8", memberName: "Nadia Hassan", memberInitials: "NH", amount: 39, method: "UPI", status: "paid", plan: "Basic", date: "2026-09-10", invoiceId: "INV-10242" },
  { id: "p-9", memberName: "Ethan Clarke", memberInitials: "EC", amount: 69, method: "Card", status: "refunded", plan: "Growth", date: "2026-08-19", invoiceId: "INV-10225" },
  { id: "p-10", memberName: "Sofia Almeida", memberInitials: "SA", amount: 69, method: "Card", status: "paid", plan: "Growth", date: "2026-09-20", invoiceId: "INV-10248" },
  { id: "p-11", memberName: "Zara Ahmed", memberInitials: "ZA", amount: 119, method: "Card", status: "pending", plan: "Elite", date: "2026-09-21", invoiceId: "INV-10250" },
  { id: "p-12", memberName: "Liam O'Connor", memberInitials: "LO", amount: 39, method: "UPI", status: "paid", plan: "Basic", date: "2026-09-05", invoiceId: "INV-10237" },
];

export const revenueByMonth = [
  { month: "Apr", revenue: 24800 },
  { month: "May", revenue: 26200 },
  { month: "Jun", revenue: 27100 },
  { month: "Jul", revenue: 25950 },
  { month: "Aug", revenue: 28430 },
  { month: "Sep", revenue: 29870 },
];

export const revenueByPlan = [
  { plan: "Growth", value: 48, amount: 14340 },
  { plan: "Elite", value: 32, amount: 9560 },
  { plan: "Basic", value: 20, amount: 5970 },
];
