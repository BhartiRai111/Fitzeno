export type MembershipStatus = "active" | "expiring" | "expired" | "frozen" | "trial";
export type LeadStatus = "new" | "contacted" | "trial-booked" | "trial-attended" | "converted" | "lost";
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
export type BookingStatus = "booked" | "waitlisted" | "attended" | "cancelled" | "no-show";

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
}

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
}

export interface Lead {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  source: "Website" | "Walk-in" | "Referral" | "Instagram" | "Google";
  status: LeadStatus;
  createdOn: string;
  lastActivity: string;
  assignedTo: string;
  notes: { id: string; author: string; date: string; text: string }[];
}

export interface Payment {
  id: string;
  memberName: string;
  memberInitials: string;
  amount: number;
  method: "Card" | "UPI" | "Cash" | "Bank Transfer";
  status: PaymentStatus;
  plan: string;
  date: string;
  invoiceId: string;
}

export interface NotificationItem {
  id: string;
  type: "payment" | "booking" | "alert" | "renewal" | "lead" | "system";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export interface BookingItem {
  id: string;
  className: string;
  trainerName: string;
  date: string;
  startTime: string;
  status: BookingStatus;
}
