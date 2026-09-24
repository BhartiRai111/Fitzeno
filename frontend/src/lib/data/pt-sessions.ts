import type { PtSession } from "./types";

export const ptSessions: PtSession[] = [
  { id: "pt-1", memberId: "m-2", memberName: "Tom Bradley", memberInitials: "TB", trainerId: "tr-1", date: "2026-09-21", startTime: "07:00", duration: 60, status: "attended", notes: "Deadlift technique — good progress on bracing." },
  { id: "pt-2", memberId: "m-7", memberName: "Isabelle Moreau", memberInitials: "IM", trainerId: "tr-1", date: "2026-09-21", startTime: "08:00", duration: 45, status: "booked" },
  { id: "pt-3", memberId: "m-10", memberName: "Oliver Bennett", memberInitials: "OB", trainerId: "tr-4", date: "2026-09-22", startTime: "10:00", duration: 60, status: "booked" },
  { id: "pt-4", memberId: "m-15", memberName: "Zara Ahmed", memberInitials: "ZA", trainerId: "tr-2", date: "2026-09-23", startTime: "16:30", duration: 45, status: "booked" },
  { id: "pt-5", memberId: "m-13", memberName: "Sofia Almeida", memberInitials: "SA", trainerId: "tr-5", date: "2026-09-20", startTime: "06:30", duration: 45, status: "attended", notes: "Cycling FTP test — improved by 8% since last month." },
  { id: "pt-6", memberId: "m-4", memberName: "Chidi Okafor", memberInitials: "CO", trainerId: "tr-6", date: "2026-09-19", startTime: "09:00", duration: 60, status: "no-show" },
  { id: "pt-7", memberId: "m-1", memberName: "Aisha Patel", memberInitials: "AP", trainerId: "tr-1", date: "2026-09-25", startTime: "11:00", duration: 60, status: "booked" },
  { id: "pt-8", memberId: "m-1", memberName: "Aisha Patel", memberInitials: "AP", trainerId: "tr-1", date: "2026-09-14", startTime: "07:00", duration: 45, status: "attended", notes: "Squat form review — depth and knee tracking both improved." },
];
