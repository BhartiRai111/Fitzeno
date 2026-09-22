"use client";

import * as React from "react";
import { toast } from "sonner";
import { gymClasses as initialClasses } from "@/lib/data/classes";
import { classBookings as initialBookings } from "@/lib/data/class-bookings";
import { ptSessions as initialPtSessions } from "@/lib/data/pt-sessions";
import { trainers } from "@/lib/data/trainers";
import { DEMO_MEMBER_ID, TODAY, getNextOccurrenceDate, formatOccurrence } from "@/lib/booking-helpers";
import { useMembership } from "@/components/portal/membership-provider";
import { formatDate } from "@/lib/utils-data";
import type { GymClass, ClassBooking, PtSession } from "@/lib/data/types";

export interface MemberClassBookingView {
  booking: ClassBooking;
  gymClass: GymClass;
  occurrenceDate: string;
  waitlistPosition: number | null;
}

interface BookPtInput {
  trainerId: string;
  day: GymClass["day"];
  occurrenceDate: string;
  startTime: string;
  duration: number;
}

interface BookingsContextValue {
  classes: GymClass[];
  bookings: ClassBooking[];
  ptSessions: PtSession[];
  memberName: string;
  memberInitials: string;
  myClassBookings: MemberClassBookingView[];
  myPtSessions: PtSession[];
  getStatusForClass: (classId: string) => "booked" | "waitlisted" | null;
  getWaitlistPosition: (classId: string) => number | null;
  bookClass: (classId: string) => boolean;
  cancelClassBooking: (bookingId: string) => void;
  rescheduleClassBooking: (bookingId: string, newClassId: string) => void;
  bookPt: (input: BookPtInput) => boolean;
  cancelPt: (sessionId: string) => void;
}

const BookingsContext = React.createContext<BookingsContextValue | null>(null);

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = React.useState<GymClass[]>(initialClasses);
  const [bookings, setBookings] = React.useState<ClassBooking[]>(initialBookings);
  const [ptSessions, setPtSessions] = React.useState<PtSession[]>(initialPtSessions);

  const { member, membershipBlock } = useMembership();

  const getStatusForClass = React.useCallback(
    (classId: string): "booked" | "waitlisted" | null => {
      const b = bookings.find(
        (x) => x.memberId === DEMO_MEMBER_ID && x.classId === classId && (x.status === "booked" || x.status === "waitlisted")
      );
      return b ? (b.status as "booked" | "waitlisted") : null;
    },
    [bookings]
  );

  const getWaitlistPosition = React.useCallback(
    (classId: string): number | null => {
      const waitlist = bookings.filter((b) => b.classId === classId && b.status === "waitlisted");
      const idx = waitlist.findIndex((b) => b.memberId === DEMO_MEMBER_ID);
      return idx === -1 ? null : idx + 1;
    },
    [bookings]
  );

  function bookClass(classId: string, silent = false): boolean {
    const gymClass = classes.find((c) => c.id === classId);
    if (!gymClass || getStatusForClass(classId)) return false;
    if (membershipBlock) {
      toast.error(membershipBlock.title, { description: membershipBlock.detail });
      return false;
    }

    const isFull = gymClass.booked >= gymClass.capacity;
    const newBooking: ClassBooking = {
      id: `cb-${Date.now()}`,
      classId,
      memberId: member.id,
      memberName: member.name,
      memberInitials: member.initials,
      bookedOn: TODAY,
      status: isFull ? "waitlisted" : "booked",
    };
    setBookings((prev) => [...prev, newBooking]);
    if (!isFull) {
      setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, booked: c.booked + 1 } : c)));
    }
    if (!silent) {
      toast.success(isFull ? "You're on the waitlist" : "Class booked!", {
        description: `${gymClass.name} · ${formatOccurrence(gymClass.day)} · ${gymClass.startTime}`,
      });
    }
    return true;
  }

  function cancelClassBooking(bookingId: string, silent = false) {
    const booking = bookings.find((b) => b.id === bookingId);
    const gymClass = booking ? classes.find((c) => c.id === booking.classId) : undefined;
    if (!booking || !gymClass) return;

    if (booking.status === "booked") {
      const waitlist = bookings.filter((b) => b.classId === booking.classId && b.status === "waitlisted");
      const promoted = waitlist[0];
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id === bookingId) return { ...b, status: "cancelled" };
          if (promoted && b.id === promoted.id) return { ...b, status: "booked" };
          return b;
        })
      );
      if (!promoted) {
        setClasses((prev) => prev.map((c) => (c.id === gymClass.id ? { ...c, booked: Math.max(0, c.booked - 1) } : c)));
      }
      if (!silent) {
        toast.success(
          "Booking cancelled",
          promoted ? { description: `${promoted.memberName} was promoted from the waitlist.` } : undefined
        );
      }
    } else if (booking.status === "waitlisted") {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)));
      if (!silent) toast.success("Removed from waitlist");
    }
  }

  function rescheduleClassBooking(bookingId: string, newClassId: string) {
    const newClass = classes.find((c) => c.id === newClassId);
    cancelClassBooking(bookingId, true);
    bookClass(newClassId, true);
    if (newClass) {
      toast.success("Booking rescheduled", {
        description: `${newClass.name} · ${formatOccurrence(newClass.day)} · ${newClass.startTime}`,
      });
    }
  }

  function bookPt(input: BookPtInput): boolean {
    if (membershipBlock) {
      toast.error(membershipBlock.title, { description: membershipBlock.detail });
      return false;
    }
    const trainer = trainers.find((t) => t.id === input.trainerId);
    const newSession: PtSession = {
      id: `pt-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberInitials: member.initials,
      trainerId: input.trainerId,
      date: input.occurrenceDate,
      startTime: input.startTime,
      duration: input.duration,
      status: "booked",
    };
    setPtSessions((prev) => [...prev, newSession]);
    toast.success("Personal training booked!", {
      description: `with ${trainer?.name ?? "your trainer"} · ${formatDate(input.occurrenceDate)} · ${input.startTime}`,
    });
    return true;
  }

  function cancelPt(sessionId: string) {
    setPtSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: "cancelled" } : s)));
    toast.success("Session cancelled");
  }

  const myClassBookings: MemberClassBookingView[] = React.useMemo(() => {
    return bookings
      .filter((b) => b.memberId === DEMO_MEMBER_ID)
      .map((b) => {
        const gymClass = classes.find((c) => c.id === b.classId)!;
        return {
          booking: b,
          gymClass,
          occurrenceDate: getNextOccurrenceDate(gymClass.day),
          waitlistPosition: b.status === "waitlisted" ? getWaitlistPosition(b.classId) : null,
        };
      })
      .filter((v) => !!v.gymClass);
  }, [bookings, classes, getWaitlistPosition]);

  const myPtSessions = React.useMemo(
    () => ptSessions.filter((s) => s.memberId === DEMO_MEMBER_ID),
    [ptSessions]
  );

  const value: BookingsContextValue = {
    classes,
    bookings,
    ptSessions,
    memberName: member.name,
    memberInitials: member.initials,
    myClassBookings,
    myPtSessions,
    getStatusForClass,
    getWaitlistPosition,
    bookClass: (classId: string) => bookClass(classId),
    cancelClassBooking: (bookingId: string) => cancelClassBooking(bookingId),
    rescheduleClassBooking,
    bookPt,
    cancelPt,
  };

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  const ctx = React.useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used within a BookingsProvider");
  return ctx;
}
