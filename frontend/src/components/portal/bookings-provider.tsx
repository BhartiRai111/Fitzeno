"use client";

import * as React from "react";
import { toast } from "sonner";
import { useClassOccurrences } from "@/hooks/use-classes";
import { useOwnClassBookings, useBookClass, useCancelOwnClassBooking, type MemberClassBookingView } from "@/hooks/use-class-bookings";
import { useOwnPtSessions, useBookPt, useCancelOwnPt } from "@/hooks/use-pt-sessions";
import { useMembership } from "@/components/portal/membership-provider";
import { formatOccurrence } from "@/lib/booking-helpers";
import { formatDate } from "@/lib/utils-data";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { GymClass, PtSession } from "@/lib/data/types";

export type { MemberClassBookingView };

interface BookPtInput {
  trainerId: string;
  date: string;
  startTime: string;
  duration: number;
}

interface BookingsContextValue {
  classes: GymClass[];
  isLoading: boolean;
  memberName: string;
  memberInitials: string;
  myClassBookings: MemberClassBookingView[];
  myPtSessions: PtSession[];
  getStatusForClass: (classId: string) => "booked" | "waitlisted" | null;
  getWaitlistPosition: (classId: string) => number | null;
  bookClass: (classId: string) => Promise<boolean>;
  cancelClassBooking: (bookingId: string) => Promise<void>;
  rescheduleClassBooking: (bookingId: string, newClassId: string) => Promise<void>;
  bookPt: (input: BookPtInput) => Promise<boolean>;
  cancelPt: (sessionId: string) => Promise<void>;
}

const BookingsContext = React.createContext<BookingsContextValue | null>(null);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof NetworkError ? err.message : fallback;
}

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  // A 2-week browsing window — enough for a full booking timetable without pulling the backend's whole 8-week default.
  const fromIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const toIso = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13);
    return d.toISOString().slice(0, 10);
  }, []);

  const { classes, isLoading: classesLoading } = useClassOccurrences({ from: fromIso, to: toIso });
  const { bookings: myClassBookings, isLoading: bookingsLoading } = useOwnClassBookings();
  const { sessions: myPtSessions, isLoading: ptLoading } = useOwnPtSessions();

  const bookClassMutation = useBookClass();
  const cancelClassMutation = useCancelOwnClassBooking();
  const bookPtMutation = useBookPt();
  const cancelPtMutation = useCancelOwnPt();

  const { member, membershipBlock } = useMembership();

  const getStatusForClass = React.useCallback(
    (classId: string): "booked" | "waitlisted" | null => {
      const gymClass = classes.find((c) => c.id === classId);
      const view = myClassBookings.find((v) => v.gymClass.id === classId);
      if (view?.booking.status === "booked" || view?.booking.status === "waitlisted") return view.booking.status;
      // Fall back to the occurrence's own myBookingStatus in case the enriched booking view hasn't loaded yet.
      void gymClass;
      return null;
    },
    [classes, myClassBookings]
  );

  const getWaitlistPosition = React.useCallback(
    (classId: string): number | null => {
      const view = myClassBookings.find((v) => v.gymClass.id === classId && v.booking.status === "waitlisted");
      return view?.waitlistPosition ?? null;
    },
    [myClassBookings]
  );

  async function bookClass(classId: string, silent = false): Promise<boolean> {
    const gymClass = classes.find((c) => c.id === classId);
    if (!gymClass || getStatusForClass(classId)) return false;
    if (membershipBlock) {
      toast.error(membershipBlock.title, { description: membershipBlock.detail });
      return false;
    }

    try {
      const created = await bookClassMutation.mutateAsync(classId);
      if (!silent) {
        const isWaitlisted = created.status === "WAITLISTED";
        toast.success(isWaitlisted ? "You're on the waitlist" : "Class booked!", {
          description: `${gymClass.name} · ${formatOccurrence(gymClass.day, undefined, gymClass.date)} · ${gymClass.startTime}`,
        });
      }
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't book this class. Please try again."));
      return false;
    }
  }

  async function cancelClassBooking(bookingId: string, silent = false): Promise<void> {
    try {
      await cancelClassMutation.mutateAsync(bookingId);
      if (!silent) toast.success("Booking cancelled");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't cancel this booking. Please try again."));
    }
  }

  async function rescheduleClassBooking(bookingId: string, newClassId: string): Promise<void> {
    const newClass = classes.find((c) => c.id === newClassId);
    await cancelClassBooking(bookingId, true);
    const booked = await bookClass(newClassId, true);
    if (booked && newClass) {
      toast.success("Booking rescheduled", {
        description: `${newClass.name} · ${formatOccurrence(newClass.day, undefined, newClass.date)} · ${newClass.startTime}`,
      });
    }
  }

  async function bookPt(input: BookPtInput): Promise<boolean> {
    if (membershipBlock) {
      toast.error(membershipBlock.title, { description: membershipBlock.detail });
      return false;
    }
    try {
      const created = await bookPtMutation.mutateAsync({
        trainerId: input.trainerId,
        date: input.date,
        startTime: input.startTime,
        durationMinutes: input.duration,
      });
      toast.success("Personal training booked!", {
        description: `${formatDate(created.date)} · ${created.startTime}`,
      });
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't book this session. Please try again."));
      return false;
    }
  }

  async function cancelPt(sessionId: string): Promise<void> {
    try {
      await cancelPtMutation.mutateAsync(sessionId);
      toast.success("Session cancelled");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't cancel this session. Please try again."));
    }
  }

  const value: BookingsContextValue = {
    classes,
    isLoading: classesLoading || bookingsLoading || ptLoading,
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
