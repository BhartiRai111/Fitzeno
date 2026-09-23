import type { NotificationItem, BookingItem, SentAnnouncement } from "./types";

// Owner/Admin — gym-wide operational visibility: leads, payments, renewals,
// attendance trends, class capacity, and staff/trainer updates.
export const ownerNotifications: NotificationItem[] = [
  { id: "on-1", type: "lead", title: "New lead captured", description: "Naomi Clarke submitted an enquiry via Instagram.", timestamp: "10 min ago", read: false, priority: "medium", href: "/owner/leads?tab=new" },
  { id: "on-1b", type: "lead", title: "Follow-up overdue", description: "Ben Foster's follow-up was due yesterday — he was offered a trial slot but hasn't booked yet.", timestamp: "This morning", read: false, priority: "high", href: "/owner/leads?tab=followups" },
  { id: "on-1c", type: "inventory", title: "5 products need restocking", description: "Training Gloves (3 left) and BCAA Recovery (out of stock) are the most urgent.", timestamp: "Yesterday", read: false, priority: "medium", href: "/owner/store?tab=inventory" },
  { id: "on-2", type: "payment", title: "Payment received", description: "Isabelle Moreau paid £119 for the Elite plan.", timestamp: "2 hours ago", read: false, priority: "low", href: "/owner/payments?tab=transactions" },
  { id: "on-3", type: "class", title: "Class nearly full", description: "Sunrise Spin (Thu 06:00) is at capacity — 20/20 booked.", timestamp: "5 hours ago", read: true, priority: "medium", href: "/owner/classes?tab=classes" },
  { id: "on-4", type: "renewal", title: "Memberships expiring soon", description: "3 memberships expire within the next 7 days.", timestamp: "Yesterday", read: false, priority: "high", href: "/owner/memberships?tab=expiring" },
  { id: "on-5", type: "payment", title: "Payment failed", description: "Grace Kim's UPI payment for the Basic plan didn't go through.", timestamp: "2 days ago", read: true, priority: "high", href: "/owner/payments?tab=pending" },
  { id: "on-6", type: "attendance", title: "Inactivity alert", description: "5 members haven't checked in for 14+ days — consider a re-engagement offer.", timestamp: "This morning", read: false, priority: "medium", href: "/owner/attendance?tab=insights" },
  { id: "on-7", type: "class", title: "Class cancelled", description: "Boxing Conditioning (Tue 18:30) was cancelled — Daniel Reyes reported illness. 13 members notified.", timestamp: "3 days ago", read: true, priority: "high", href: "/owner/classes?tab=classes" },
  { id: "on-8", type: "staff", title: "Staff invite still pending", description: "Ruby Simmons hasn't accepted her Front Desk invite yet — sent 3 days ago.", timestamp: "3 days ago", read: true, priority: "low", href: "/owner/staff" },
  { id: "on-9", type: "payment", title: "Refund issued", description: "£69 refunded to Ethan Clarke for the Growth plan.", timestamp: "1 month ago", read: true, priority: "low", href: "/owner/payments?tab=refunds" },
];

// Member — scoped strictly to the signed-in member's own bookings, membership,
// payments and attendance, plus gym-wide announcements/offers they've opted into.
export const memberNotifications: NotificationItem[] = [
  { id: "mn-1", type: "booking", title: "Class booking confirmed", description: "You're booked for Strength Fundamentals, Fri 09:00.", timestamp: "1 hour ago", read: false, priority: "low", href: "/portal/bookings" },
  { id: "mn-2", type: "renewal", title: "Membership renews in 6 days", description: "Your Growth plan renews on 27 Sept. The payment method on file will be charged.", timestamp: "3 hours ago", read: false, priority: "high", href: "/portal/membership" },
  { id: "mn-3", type: "waitlist", title: "You're on the waitlist", description: "You're #3 on the waitlist for Power Hour HIIT, Mon 18:00. We'll notify you if a spot opens.", timestamp: "5 hours ago", read: false, priority: "medium", href: "/portal/bookings" },
  { id: "mn-4", type: "class", title: "Class cancelled", description: "Midday Mobility (Wed 12:30), which you had booked, was cancelled by the studio.", timestamp: "3 days ago", read: true, priority: "medium", href: "/portal/classes" },
  { id: "mn-5", type: "payment", title: "Payment receipt ready", description: "Receipt for £69 (Growth plan) is ready to download.", timestamp: "3 days ago", read: true, priority: "low", href: "/portal/membership" },
  { id: "mn-6", type: "announcement", title: "Front desk closing early Friday", description: "We'll be closing early at 6pm this Friday for maintenance.", timestamp: "2 days ago", read: true, priority: "medium" },
  { id: "mn-7", type: "attendance", title: "4-day streak!", description: "You've checked in 4 days in a row — keep it going.", timestamp: "This morning", read: false, priority: "low", href: "/portal/progress" },
  { id: "mn-8", type: "promotion", title: "Refer a friend", description: "Refer a friend and you'll both get a free month.", timestamp: "1 day ago", read: true, priority: "low", href: "/portal/membership" },
  { id: "mn-9", type: "payment", title: "Payment failed", description: "Your card was declined for the Growth plan renewal. Please update your payment method.", timestamp: "3 weeks ago", read: true, priority: "high", href: "/portal/membership" },
];

// Trainer — scoped to this trainer's own classes, assigned members, and PT
// sessions only. Other trainers' rosters and cancellations never appear here.
export const trainerNotifications: NotificationItem[] = [
  { id: "tn-1", type: "booking", title: "New PT booking", description: "Aisha Patel booked a session with you for Fri 11:00.", timestamp: "20 min ago", read: false, priority: "medium", href: "/trainer/schedule" },
  { id: "tn-2", type: "booking", title: "Session cancelled", description: "Oliver Bennett cancelled Thursday's 09:00 session.", timestamp: "2 hours ago", read: false, priority: "medium", href: "/trainer/schedule" },
  { id: "tn-3", type: "class", title: "Class nearly full", description: "Your Strength Fundamentals class (Fri 09:00) is nearly full — 10/12 booked.", timestamp: "5 hours ago", read: true, priority: "low", href: "/trainer/schedule" },
  { id: "tn-4", type: "attendance", title: "Attendance still open", description: "Strength Fundamentals (Mon 09:00) has 3 members not yet marked present.", timestamp: "30 min ago", read: false, priority: "high", href: "/trainer/attendance" },
  { id: "tn-5", type: "system", title: "Availability reminder", description: "You haven't set your availability for next week yet.", timestamp: "Yesterday", read: true, priority: "medium", href: "/trainer/availability" },
  { id: "tn-6", type: "announcement", title: "Front desk closing early Friday", description: "We'll be closing early at 6pm this Friday for maintenance.", timestamp: "2 days ago", read: true, priority: "medium" },
  { id: "tn-7", type: "booking", title: "Session confirmed", description: "Isabelle Moreau confirmed tomorrow's 08:00 PT session.", timestamp: "1 day ago", read: true, priority: "low", href: "/trainer/schedule" },
];

export const sentAnnouncements: SentAnnouncement[] = [
  { id: "sa-1", title: "Front desk closing early Friday", message: "We'll be closing early at 6pm this Friday for maintenance.", audienceLabel: "All members", recipientCount: 640, priority: "medium", sentBy: "Sam Carter", sentOn: "2026-09-19" },
  { id: "sa-2", title: "New Sunrise Spin slot", message: "We've added a second Sunrise Spin session on Wednesdays at 6am due to demand.", audienceLabel: "All members", recipientCount: 640, priority: "low", sentBy: "Sam Carter", sentOn: "2026-09-10" },
  { id: "sa-3", title: "Trainer certification update", message: "Congrats to Daniel Reyes on completing his Level 3 PT certification!", audienceLabel: "All trainers & staff", recipientCount: 10, priority: "low", sentBy: "Sam Carter", sentOn: "2026-09-05" },
];

export const upcomingBookings: BookingItem[] = [
  { id: "b-1", className: "Strength Fundamentals", trainerName: "Maya Okonkwo", date: "Fri, Sep 25", startTime: "09:00", status: "booked" },
  { id: "b-2", className: "Vinyasa Flow", trainerName: "Priya Chandran", date: "Fri, Sep 25", startTime: "17:30", status: "booked" },
  { id: "b-3", className: "Power Hour HIIT", trainerName: "Daniel Reyes", date: "Mon, Sep 28", startTime: "18:00", status: "waitlisted" },
];
