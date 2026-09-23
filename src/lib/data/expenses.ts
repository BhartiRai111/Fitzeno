import type { Expense } from "./types";

export const expenses: Expense[] = [
  // ------------------------------------------------------------------
  // August
  // ------------------------------------------------------------------
  { id: "exp-1", reference: "EXP-2001", title: "Studio rent — August", category: "Rent", amount: 3200, date: "2026-08-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "Riverside Property Management", recordedBy: "Sam Carter" },
  { id: "exp-2", reference: "EXP-2002", title: "Gym management software", category: "Software", amount: 89, date: "2026-08-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "GymFlow Software", recordedBy: "Sam Carter" },
  { id: "exp-3", reference: "EXP-2003", title: "Music licensing (PPL/PRS)", category: "Software", amount: 35, date: "2026-08-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "PlayNet Music Licensing", recordedBy: "Sam Carter" },
  { id: "exp-4", reference: "EXP-2004", title: "Accounting software", category: "Software", amount: 45, date: "2026-08-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "LedgerBooks", recordedBy: "Sam Carter" },
  { id: "exp-5", reference: "EXP-2005", title: "Cleaning service — August", category: "Cleaning", amount: 450, date: "2026-08-03", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "SparkleClean Commercial", recordedBy: "Freya Whitmore" },
  { id: "exp-6", reference: "EXP-2006", title: "Electricity, water & gas — August", category: "Utilities", amount: 680, date: "2026-08-05", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "NorthGrid Energy", recordedBy: "Freya Whitmore" },
  { id: "exp-7", reference: "EXP-2007", title: "Dumbbell set (10–22kg range)", category: "Equipment", amount: 1200, date: "2026-08-12", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Bank Transfer", vendor: "IronCore Equipment", recordedBy: "Freya Whitmore", notes: "Replaced the worn dumbbell range on the strength floor." },
  { id: "exp-8", reference: "EXP-2008", title: "AC repair — Conditioning Studio", category: "Maintenance", amount: 350, date: "2026-08-14", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "CoolAir HVAC Services", recordedBy: "Freya Whitmore" },
  { id: "exp-9", reference: "EXP-2009", title: "Instagram ad campaign — August", category: "Marketing", amount: 250, date: "2026-08-15", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "Meta Ads", recordedBy: "Sam Carter" },
  { id: "exp-10", reference: "EXP-2010", title: "Cleaning & office supplies restock", category: "Supplies", amount: 140, date: "2026-08-18", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "Costco Business", recordedBy: "Freya Whitmore" },
  { id: "exp-11", reference: "EXP-2011", title: "Business insurance premium — Q3", category: "Other", amount: 620, date: "2026-08-20", status: "paid", recurring: true, frequency: "quarterly", paymentMethod: "Bank Transfer", vendor: "CoverGym Insurance", recordedBy: "Sam Carter" },
  { id: "exp-12", reference: "EXP-2012", title: "5-a-side league sponsorship", category: "Marketing", amount: 500, date: "2026-08-25", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Bank Transfer", vendor: "Riverside Sports League", recordedBy: "Sam Carter" },
  { id: "exp-13", reference: "EXP-2013", title: "Staff payroll — August", category: "Salaries", amount: 14500, date: "2026-08-28", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "Payroll", recordedBy: "Sam Carter", notes: "August payroll run — 9 staff." },
  { id: "exp-14", reference: "EXP-2014", title: "First aid kit & AED pad restock", category: "Other", amount: 65, date: "2026-08-28", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "MedSupply Direct", recordedBy: "Freya Whitmore" },

  // ------------------------------------------------------------------
  // September
  // ------------------------------------------------------------------
  { id: "exp-15", reference: "EXP-2015", title: "Studio rent — September", category: "Rent", amount: 3200, date: "2026-09-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "Riverside Property Management", recordedBy: "Sam Carter" },
  { id: "exp-16", reference: "EXP-2016", title: "Gym management software", category: "Software", amount: 89, date: "2026-09-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "GymFlow Software", recordedBy: "Sam Carter" },
  { id: "exp-17", reference: "EXP-2017", title: "Music licensing (PPL/PRS)", category: "Software", amount: 35, date: "2026-09-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "PlayNet Music Licensing", recordedBy: "Sam Carter" },
  { id: "exp-18", reference: "EXP-2018", title: "Accounting software", category: "Software", amount: 45, date: "2026-09-01", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "LedgerBooks", recordedBy: "Sam Carter" },
  { id: "exp-19", reference: "EXP-2019", title: "Cleaning service — September", category: "Cleaning", amount: 450, date: "2026-09-03", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "SparkleClean Commercial", recordedBy: "Freya Whitmore" },
  { id: "exp-20", reference: "EXP-2020", title: "Sponsored local radio ad", category: "Marketing", amount: 400, date: "2026-09-05", status: "cancelled", recurring: false, frequency: "one-time", paymentMethod: "Bank Transfer", vendor: "Riverside FM", recordedBy: "Sam Carter", notes: "Campaign cancelled before airing — refunded in full by the vendor." },
  { id: "exp-21", reference: "EXP-2021", title: "Electricity, water & gas — September", category: "Utilities", amount: 710, date: "2026-09-05", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "NorthGrid Energy", recordedBy: "Freya Whitmore", notes: "Higher than usual — extended opening hours during the September promotion." },
  { id: "exp-22", reference: "EXP-2022", title: "Staff CPR / First Aid training course", category: "Other", amount: 280, date: "2026-09-06", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "SafeHands Training", recordedBy: "Freya Whitmore" },
  { id: "exp-23", reference: "EXP-2023", title: "Treadmill belt replacement", category: "Equipment", amount: 320, date: "2026-09-08", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "IronCore Equipment", recordedBy: "Freya Whitmore" },
  { id: "exp-24", reference: "EXP-2024", title: "Yoga mats — bulk order (20 units)", category: "Equipment", amount: 180, date: "2026-09-10", dueDate: "2026-09-25", status: "pending", recurring: false, frequency: "one-time", paymentMethod: "Bank Transfer", vendor: "IronCore Equipment", recordedBy: "Freya Whitmore" },
  { id: "exp-25", reference: "EXP-2025", title: "Plumbing fix — locker room", category: "Maintenance", amount: 180, date: "2026-09-12", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "QuickFix Plumbing", recordedBy: "Freya Whitmore" },
  { id: "exp-26", reference: "EXP-2026", title: "Instagram ad campaign — September", category: "Marketing", amount: 300, date: "2026-09-15", dueDate: "2026-09-30", status: "pending", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "Meta Ads", recordedBy: "Sam Carter" },
  { id: "exp-27", reference: "EXP-2027", title: "Flyer printing", category: "Marketing", amount: 80, date: "2026-09-14", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Cash", vendor: "PrintHouse Manchester", recordedBy: "Sam Carter" },
  { id: "exp-28", reference: "EXP-2028", title: "Towels & amenities restock", category: "Supplies", amount: 95, date: "2026-09-16", status: "paid", recurring: false, frequency: "one-time", paymentMethod: "Card", vendor: "Costco Business", recordedBy: "Freya Whitmore" },
  { id: "exp-29", reference: "EXP-2029", title: "Booking widget subscription", category: "Software", amount: 29, date: "2026-09-17", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "BookFlow", recordedBy: "Sam Carter", notes: "Trial upgraded to a paid plan." },
  { id: "exp-30", reference: "EXP-2030", title: "Card & bank processing fees", category: "Other", amount: 145, date: "2026-09-18", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "Stripe / Square", recordedBy: "Sam Carter" },
  { id: "exp-31", reference: "EXP-2031", title: "Member CRM add-on", category: "Software", amount: 59, date: "2026-09-19", status: "paid", recurring: true, frequency: "monthly", paymentMethod: "Card", vendor: "GymFlow Software", recordedBy: "Sam Carter", notes: "Added the CRM add-on for automated lead follow-up." },
  { id: "exp-32", reference: "EXP-2032", title: "Staff payroll — September", category: "Salaries", amount: 14700, date: "2026-09-28", dueDate: "2026-09-28", status: "pending", recurring: true, frequency: "monthly", paymentMethod: "Bank Transfer", vendor: "Payroll", recordedBy: "Sam Carter", notes: "September payroll run — 9 staff, including onboarding shifts for the new starter." },
];

/**
 * Whole-business monthly expense totals (Apr–Sep), matching the scale of
 * `revenueByMonth` — the granular `expenses` records above are a
 * representative sample, not a full ledger, so the two aren't expected to
 * sum to these figures exactly.
 */
export const expensesByMonth = [
  { month: "Apr", expenses: 16400 },
  { month: "May", expenses: 16900 },
  { month: "Jun", expenses: 17200 },
  { month: "Jul", expenses: 17600 },
  { month: "Aug", expenses: 18900 },
  { month: "Sep", expenses: 19800 },
];
