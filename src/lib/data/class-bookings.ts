import type { ClassBooking } from "./types";

export const classBookings: ClassBooking[] = [
  { id: "cb-1", classId: "cl-3", memberName: "Ravi Shankar", memberInitials: "RS", bookedOn: "2026-09-18", status: "booked" },
  { id: "cb-2", classId: "cl-3", memberName: "Sofia Almeida", memberInitials: "SA", bookedOn: "2026-09-19", status: "booked" },
  { id: "cb-3", classId: "cl-3", memberName: "Hannah Wu", memberInitials: "HW", bookedOn: "2026-09-20", status: "waitlisted" },
  { id: "cb-4", classId: "cl-3", memberName: "Liam O'Connor", memberInitials: "LO", bookedOn: "2026-09-20", status: "waitlisted" },
  { id: "cb-5", classId: "cl-3", memberName: "Nadia Hassan", memberInitials: "NH", bookedOn: "2026-09-21", status: "waitlisted" },
  { id: "cb-6", classId: "cl-3", memberName: "Grace Kim", memberInitials: "GK", bookedOn: "2026-09-21", status: "waitlisted" },
  { id: "cb-7", classId: "cl-8", memberName: "Tom Bradley", memberInitials: "TB", bookedOn: "2026-09-17", status: "booked" },
  { id: "cb-8", classId: "cl-8", memberName: "Zara Ahmed", memberInitials: "ZA", bookedOn: "2026-09-18", status: "waitlisted" },
  { id: "cb-9", classId: "cl-8", memberName: "Ethan Clarke", memberInitials: "EC", bookedOn: "2026-09-19", status: "waitlisted" },
  { id: "cb-10", classId: "cl-12", memberName: "Oliver Bennett", memberInitials: "OB", bookedOn: "2026-09-19", status: "waitlisted" },
  { id: "cb-11", classId: "cl-1", memberName: "Aisha Patel", memberInitials: "AP", bookedOn: "2026-09-16", status: "attended" },
  { id: "cb-12", classId: "cl-1", memberName: "Isabelle Moreau", memberInitials: "IM", bookedOn: "2026-09-16", status: "attended" },
  { id: "cb-13", classId: "cl-4", memberName: "Lena Fischer", memberInitials: "LF", bookedOn: "2026-09-15", status: "cancelled" },
];
