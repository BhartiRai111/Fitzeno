import type { NotificationItem, BookingItem } from "./types";

export const ownerNotifications: NotificationItem[] = [
  { id: "on-1", type: "lead", title: "New lead captured", description: "Naomi Clarke submitted an enquiry via Instagram.", timestamp: "10 min ago", read: false },
  { id: "on-2", type: "payment", title: "Payment received", description: "Isabelle Moreau paid £119 for the Elite plan.", timestamp: "2 hours ago", read: false },
  { id: "on-3", type: "alert", title: "Class nearly full", description: "Sunrise Spin (Thu 06:00) is at capacity — 20/20 booked.", timestamp: "5 hours ago", read: true },
  { id: "on-4", type: "renewal", title: "Membership expiring", description: "3 memberships expire within the next 7 days.", timestamp: "Yesterday", read: true },
  { id: "on-5", type: "alert", title: "Payment failed", description: "Grace Kim's UPI payment for Basic plan did not go through.", timestamp: "2 days ago", read: true },
  { id: "on-6", type: "alert", title: "Inactivity alert", description: "5 members haven't checked in for 14+ days — consider a re-engagement offer.", timestamp: "This morning", read: false },
];

export const memberNotifications: NotificationItem[] = [
  { id: "mn-1", type: "booking", title: "Class booking confirmed", description: "You're booked for Strength Fundamentals, Fri 09:00.", timestamp: "1 hour ago", read: false },
  { id: "mn-2", type: "renewal", title: "Membership renews in 6 days", description: "Your Growth plan renews on Sep 27. Payment method on file will be charged.", timestamp: "3 hours ago", read: false },
  { id: "mn-3", type: "system", title: "Offer unlocked", description: "Refer a friend and you'll both get a free month.", timestamp: "1 day ago", read: true },
  { id: "mn-4", type: "booking", title: "Waitlist update", description: "A spot opened up in Boxing Conditioning — you're now booked.", timestamp: "2 days ago", read: true },
  { id: "mn-5", type: "payment", title: "Payment receipt", description: "Receipt for £69 (Growth plan) is ready to download.", timestamp: "3 days ago", read: true },
  { id: "mn-6", type: "system", title: "4-day streak!", description: "You've checked in 4 days in a row — keep it going.", timestamp: "This morning", read: false },
];

export const trainerNotifications: NotificationItem[] = [
  { id: "tn-1", type: "booking", title: "New PT booking", description: "Aisha Patel booked a session with you for Fri 11:00.", timestamp: "20 min ago", read: false },
  { id: "tn-2", type: "booking", title: "Session cancelled", description: "Chidi Okafor cancelled Thursday's 09:00 session.", timestamp: "2 hours ago", read: false },
  { id: "tn-3", type: "alert", title: "Class nearly full", description: "Your Power Hour HIIT class is at 16/16 with a waitlist of 4.", timestamp: "5 hours ago", read: true },
  { id: "tn-4", type: "system", title: "Availability reminder", description: "You haven't set availability for next week yet.", timestamp: "Yesterday", read: true },
  { id: "tn-5", type: "alert", title: "Attendance still open", description: "Strength Fundamentals (Mon 09:00) has 3 members not yet marked present.", timestamp: "30 min ago", read: false },
];

export const upcomingBookings: BookingItem[] = [
  { id: "b-1", className: "Strength Fundamentals", trainerName: "Maya Okonkwo", date: "Fri, Sep 25", startTime: "09:00", status: "booked" },
  { id: "b-2", className: "Vinyasa Flow", trainerName: "Priya Chandran", date: "Fri, Sep 25", startTime: "17:30", status: "booked" },
  { id: "b-3", className: "Power Hour HIIT", trainerName: "Daniel Reyes", date: "Mon, Sep 28", startTime: "18:00", status: "waitlisted" },
];
