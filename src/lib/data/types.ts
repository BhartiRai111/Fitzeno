export type MembershipStatus = "active" | "expiring" | "expired" | "frozen" | "trial" | "cancelled";
export type LeadStatus = "new" | "contacted" | "follow-up" | "trial-booked" | "trial-attended" | "converted" | "lost";
export type LeadLostReason = "No response" | "Not interested" | "Price" | "Chose another gym" | "Bad timing" | "Other";
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
export type BookingStatus = "booked" | "waitlisted" | "attended" | "cancelled" | "no-show";
export type LeadSource = "Website" | "Instagram" | "Referral" | "Walk-in" | "Advertisement";

export interface Trainer {
  id: string;
  name: string;
  initials: string;
  role: string;
  specialties: string[];
  bio: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  color: "indigo" | "lime" | "amber" | "sky";
  email?: string;
  phone?: string;
  joinedOn?: string;
  status?: StaffStatus;
  permissionOverrides?: Partial<Record<PermissionArea, PermissionLevel>>;
}

export type StaffAccessRole = "owner" | "manager" | "trainer" | "front-desk";
export type StaffStatus = "active" | "invited" | "inactive";

export type PermissionArea =
  | "members"
  | "bookings"
  | "attendance"
  | "memberships"
  | "payments"
  | "store"
  | "finance"
  | "reports"
  | "staff"
  | "announcements"
  | "settings";

export type PermissionLevel = "none" | "view" | "manage";

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: "month" | "year";
  description: string;
  perks: string[];
  popular?: boolean;
  color?: string;
}

export interface GymClass {
  id: string;
  name: string;
  type: "HIIT" | "Yoga" | "Strength" | "Spin" | "Boxing" | "Mobility" | "Pilates";
  trainerId: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  startTime: string;
  duration: number;
  capacity: number;
  booked: number;
  location: string;
}

export interface Testimonial {
  id: string;
  name: string;
  initials: string;
  memberSince: string;
  rating: number;
  quote: string;
}

export interface Offer {
  id: string;
  title: string;
  code: string;
  description: string;
  discount: string;
  validUntil: string;
  applicablePlans: string[];
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface Member {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  plan: string;
  status: MembershipStatus;
  joinedOn: string;
  expiresOn: string;
  lastCheckIn: string;
  lifetimeValue: number;
  trainerId?: string;
  paymentStatus: PaymentStatus;
  attendanceThisMonth: number;
  autoRenew?: boolean;
  gender: "Male" | "Female" | "Other";
  dob: string;
  address: string;
  emergencyContact: string;
  notes: { id: string; author: string; date: string; text: string }[];
}

export interface Lead {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  source: LeadSource;
  interest: string;
  status: LeadStatus;
  createdOn: string;
  lastActivity: string;
  nextFollowUp: string | null;
  assignedTo: string;
  notes: { id: string; author: string; date: string; text: string }[];
  lostReason?: LeadLostReason;
  /** The class this lead's free trial is booked into. */
  trialClassId?: string;
  /** Computed next-occurrence date for the trial class, e.g. "2026-09-26". */
  trialDate?: string;
  convertedPlanId?: string;
  convertedOn?: string;
}

export type RevenueCategory = "Membership" | "Personal Training" | "Classes" | "Retail" | "Other";

export interface Payment {
  id: string;
  memberName: string;
  memberInitials: string;
  amount: number;
  method: "Card" | "UPI" | "Cash" | "Bank Transfer";
  status: PaymentStatus;
  plan: string;
  category: RevenueCategory;
  date: string;
  invoiceId: string;
}

export type NotificationCategory =
  | "booking"
  | "waitlist"
  | "class"
  | "renewal"
  | "payment"
  | "attendance"
  | "lead"
  | "staff"
  | "announcement"
  | "promotion"
  | "system"
  | "inventory"
  | "expense";

export type NotificationPriority = "high" | "medium" | "low";

export interface NotificationItem {
  id: string;
  type: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  priority: NotificationPriority;
  /** Deep link into the related feature — omitted for purely informational items. */
  href?: string;
}

export interface SentAnnouncement {
  id: string;
  title: string;
  message: string;
  audienceLabel: string;
  recipientCount: number;
  priority: NotificationPriority;
  sentBy: string;
  sentOn: string;
}

export interface BookingItem {
  id: string;
  className: string;
  trainerName: string;
  date: string;
  startTime: string;
  status: BookingStatus;
}

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  /** Display job title, e.g. "Front Desk / Sales" — distinct from the access role that drives permissions. */
  title: string;
  accessRole: StaffAccessRole;
  email: string;
  phone: string;
  status: StaffStatus;
  joinedOn: string;
  permissionOverrides: Partial<Record<PermissionArea, PermissionLevel>>;
  recentActivity: string[];
}

export interface PtSession {
  id: string;
  memberId?: string;
  memberName: string;
  memberInitials: string;
  trainerId: string;
  date: string;
  startTime: string;
  duration: number;
  status: BookingStatus;
  notes?: string;
}

export interface ClassBooking {
  id: string;
  classId: string;
  memberId?: string;
  memberName: string;
  memberInitials: string;
  bookedOn: string;
  status: BookingStatus;
}

export interface TrainerAvailabilitySlot {
  id: string;
  trainerId: string;
  day: GymClass["day"];
  startTime: string;
  endTime: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  plan: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  method: "QR Check-in" | "Manual" | "Kiosk";
}

export interface ActivityItem {
  id: string;
  type: "member-joined" | "payment" | "booking" | "renewal" | "trainer" | "check-in" | "lead";
  description: string;
  person: string;
  timestamp: string;
}

export interface AlertItem {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  href: string;
}

// ---------------------------------------------------------------------------
// Store / POS / Inventory
// ---------------------------------------------------------------------------

export type ProductCategory = "Supplements" | "Hydration" | "Apparel" | "Accessories" | "Equipment";
export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
export type SaleStatus = "completed" | "refunded" | "cancelled";
export type InventoryMovementType = "restock" | "sale" | "return" | "damaged" | "adjustment";

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  leadTimeDays: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  description: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  supplierId?: string;
  /** Whether this product is currently sold — discontinued/hidden products stay false. */
  active: boolean;
  createdOn: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: InventoryMovementType;
  /** Positive for stock added (restock/return), negative for stock removed (sale/damaged), signed for adjustment. */
  quantity: number;
  date: string;
  note: string;
  reference?: string;
}

export interface StoreSaleItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface StoreSale {
  id: string;
  orderNumber: string;
  items: StoreSaleItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  /** VAT portion already included within `total` — informational, not added on top. */
  tax: number;
  total: number;
  paymentMethod: "Card" | "UPI" | "Cash" | "Bank Transfer";
  status: SaleStatus;
  memberId?: string;
  memberName?: string;
  soldBy: string;
  date: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Expenses / Financial overview
// ---------------------------------------------------------------------------

export type ExpenseCategory =
  | "Rent"
  | "Salaries"
  | "Utilities"
  | "Marketing"
  | "Software"
  | "Maintenance"
  | "Cleaning"
  | "Equipment"
  | "Supplies"
  | "Other";

export type ExpenseStatus = "paid" | "pending" | "cancelled";
export type ExpenseFrequency = "one-time" | "monthly" | "quarterly" | "yearly";

export interface Expense {
  id: string;
  reference: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  /** Date the expense was incurred/recorded. */
  date: string;
  /** For pending expenses — when payment is due. */
  dueDate?: string;
  status: ExpenseStatus;
  recurring: boolean;
  frequency: ExpenseFrequency;
  paymentMethod: "Card" | "Bank Transfer" | "Cash" | "UPI";
  vendor?: string;
  notes?: string;
  recordedBy: string;
}
