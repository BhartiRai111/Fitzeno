import type { Payment } from "./types";

export const payments: Payment[] = [
  { id: "p-1", memberName: "Aisha Patel", memberInitials: "AP", amount: 69, method: "Card", status: "paid", plan: "Growth", category: "Membership", date: "2026-09-14", invoiceId: "INV-10241" },
  { id: "p-2", memberName: "Tom Bradley", memberInitials: "TB", amount: 119, method: "Card", status: "paid", plan: "Elite", category: "Membership", date: "2026-09-02", invoiceId: "INV-10238" },
  { id: "p-3", memberName: "Grace Kim", memberInitials: "GK", amount: 39, method: "UPI", status: "failed", plan: "Basic", category: "Membership", date: "2026-09-08", invoiceId: "INV-10240" },
  { id: "p-4", memberName: "Ravi Shankar", memberInitials: "RS", amount: 69, method: "Bank Transfer", status: "paid", plan: "Growth", category: "Membership", date: "2026-08-30", invoiceId: "INV-10233" },
  { id: "p-5", memberName: "Isabelle Moreau", memberInitials: "IM", amount: 119, method: "Card", status: "paid", plan: "Elite", category: "Membership", date: "2026-09-19", invoiceId: "INV-10247" },
  { id: "p-6", memberName: "Hannah Wu", memberInitials: "HW", amount: 69, method: "Card", status: "pending", plan: "Growth", category: "Membership", date: "2026-09-21", invoiceId: "INV-10249" },
  { id: "p-7", memberName: "Oliver Bennett", memberInitials: "OB", amount: 119, method: "Cash", status: "paid", plan: "Elite", category: "Membership", date: "2026-09-01", invoiceId: "INV-10236" },
  { id: "p-8", memberName: "Nadia Hassan", memberInitials: "NH", amount: 39, method: "UPI", status: "paid", plan: "Basic", category: "Membership", date: "2026-09-10", invoiceId: "INV-10242" },
  { id: "p-9", memberName: "Ethan Clarke", memberInitials: "EC", amount: 69, method: "Card", status: "refunded", plan: "Growth", category: "Membership", date: "2026-08-19", invoiceId: "INV-10225" },
  { id: "p-10", memberName: "Sofia Almeida", memberInitials: "SA", amount: 69, method: "Card", status: "paid", plan: "Growth", category: "Membership", date: "2026-09-20", invoiceId: "INV-10248" },
  { id: "p-11", memberName: "Zara Ahmed", memberInitials: "ZA", amount: 119, method: "Card", status: "pending", plan: "Elite", category: "Membership", date: "2026-09-21", invoiceId: "INV-10250" },
  { id: "p-12", memberName: "Liam O'Connor", memberInitials: "LO", amount: 39, method: "UPI", status: "paid", plan: "Basic", category: "Membership", date: "2026-09-05", invoiceId: "INV-10237" },
  { id: "p-13", memberName: "Tom Bradley", memberInitials: "TB", amount: 45, method: "Card", status: "paid", plan: "PT Session", category: "Personal Training", date: "2026-09-21", invoiceId: "INV-10251" },
  { id: "p-14", memberName: "Sofia Almeida", memberInitials: "SA", amount: 45, method: "Card", status: "paid", plan: "PT Session", category: "Personal Training", date: "2026-09-20", invoiceId: "INV-10252" },
  { id: "p-15", memberName: "Chidi Okafor", memberInitials: "CO", amount: 45, method: "Cash", status: "failed", plan: "PT Session", category: "Personal Training", date: "2026-09-19", invoiceId: "INV-10253" },
  { id: "p-16", memberName: "Ravi Shankar", memberInitials: "RS", amount: 12, method: "UPI", status: "paid", plan: "Drop-in class", category: "Classes", date: "2026-09-18", invoiceId: "INV-10254" },
  { id: "p-17", memberName: "Nadia Hassan", memberInitials: "NH", amount: 8, method: "Card", status: "paid", plan: "Protein shake", category: "Retail", date: "2026-09-17", invoiceId: "INV-10255" },
  { id: "p-18", memberName: "Oliver Bennett", memberInitials: "OB", amount: 25, method: "Card", status: "paid", plan: "Guest pass", category: "Other", date: "2026-09-16", invoiceId: "INV-10256" },
];

export const revenueByMonth = [
  { month: "Apr", revenue: 24800 },
  { month: "May", revenue: 26200 },
  { month: "Jun", revenue: 27100 },
  { month: "Jul", revenue: 25950 },
  { month: "Aug", revenue: 28430 },
  { month: "Sep", revenue: 29870 },
];

export const revenueByDay = [
  { label: "Sep 8", revenue: 920 },
  { label: "Sep 9", revenue: 860 },
  { label: "Sep 10", revenue: 1140 },
  { label: "Sep 11", revenue: 1020 },
  { label: "Sep 12", revenue: 980 },
  { label: "Sep 13", revenue: 640 },
  { label: "Sep 14", revenue: 560 },
  { label: "Sep 15", revenue: 1080 },
  { label: "Sep 16", revenue: 1160 },
  { label: "Sep 17", revenue: 990 },
  { label: "Sep 18", revenue: 1240 },
  { label: "Sep 19", revenue: 1310 },
  { label: "Sep 20", revenue: 720 },
  { label: "Sep 21", revenue: 480 },
];

export const revenueByWeek = [
  { label: "Wk 30", revenue: 6120 },
  { label: "Wk 31", revenue: 6480 },
  { label: "Wk 32", revenue: 6940 },
  { label: "Wk 33", revenue: 7010 },
  { label: "Wk 34", revenue: 6850 },
  { label: "Wk 35", revenue: 7220 },
  { label: "Wk 36", revenue: 7380 },
  { label: "Wk 37", revenue: 5920 },
];

export const revenueByPlan = [
  { plan: "Growth", value: 48, amount: 14340 },
  { plan: "Elite", value: 32, amount: 9560 },
  { plan: "Basic", value: 20, amount: 5970 },
];

export const revenueByCategory = [
  { category: "Membership", amount: 25680, share: 86 },
  { category: "Personal Training", amount: 2340, share: 8 },
  { category: "Classes", amount: 890, share: 3 },
  { category: "Retail", amount: 460, share: 1.5 },
  { category: "Other", amount: 500, share: 1.5 },
];
