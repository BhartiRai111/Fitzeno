"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, MapPin, Star, CheckCircle2, AlertTriangle, ListOrdered } from "lucide-react";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CapacityBar } from "@/components/shared/capacity-bar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useBookings } from "@/components/portal/bookings-provider";
import { trainers } from "@/lib/data/trainers";
import { DEMO_MEMBER_ID, formatOccurrence, getMemberScheduleConflicts } from "@/lib/booking-helpers";
import type { GymClass } from "@/lib/data/types";

interface ClassDetailSheetProps {
  gymClass: GymClass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassDetailSheet({ gymClass, open, onOpenChange }: ClassDetailSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { classes, bookings, myPtSessions, getStatusForClass, getWaitlistPosition, bookClass, cancelClassBooking } =
    useBookings();
  const [justBooked, setJustBooked] = React.useState(false);

  React.useEffect(() => {
    // Intentional: reset the success view each time this sheet is reopened for a class.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustBooked(false);
    }
  }, [open, gymClass?.id]);

  const Header = isDesktop ? DialogHeader : SheetHeader;
  const Title = isDesktop ? DialogTitle : SheetTitle;
  const Description = isDesktop ? DialogDescription : SheetDescription;
  const Footer = isDesktop ? DialogFooter : SheetFooter;

  if (!gymClass) return null;

  const live = classes.find((c) => c.id === gymClass.id) ?? gymClass;
  const trainer = trainers.find((t) => t.id === live.trainerId);
  const status = getStatusForClass(live.id);
  const waitlistPosition = status === "waitlisted" ? getWaitlistPosition(live.id) : null;
  const isFull = live.booked >= live.capacity;
  const myBooking = bookings.find(
    (b) => b.memberId === DEMO_MEMBER_ID && b.classId === live.id && (b.status === "booked" || b.status === "waitlisted")
  );
  const conflicts = !status
    ? getMemberScheduleConflicts(classes, bookings, myPtSessions, DEMO_MEMBER_ID, live.day, live.startTime, live.duration)
    : [];

  if (justBooked) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} contentClassName="sm:max-w-md">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
            <CheckCircle2 className="size-9" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">
              {isFull ? "You're on the waitlist" : "You're booked!"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {live.name} · {formatOccurrence(live.day)} · {live.startTime}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button asChild className="flex-1">
              <Link href="/portal/bookings" onClick={() => onOpenChange(false)}>
                View My Bookings
              </Link>
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} contentClassName="sm:max-w-md">
      <Header>
        <Badge variant="outline" className="w-fit">{live.type}</Badge>
        <Title>{live.name}</Title>
        <Description>with {trainer?.name}</Description>
      </Header>

      <div className="space-y-4">
        {trainer && (
          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <Avatar className="size-10">
              <AvatarFallback>{trainer.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{trainer.name}</p>
              <p className="truncate text-xs text-muted-foreground">{trainer.role}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-brand-lime text-brand-lime" />
              {trainer.rating}
            </span>
          </div>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <Clock className="size-4 shrink-0" />
            {formatOccurrence(live.day)} · {live.startTime} · {live.duration} min
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="size-4 shrink-0" />
            {live.location}
          </div>
        </div>

        <CapacityBar booked={live.booked} capacity={live.capacity} />

        {status === "waitlisted" && (
          <div className="flex items-center gap-2.5 rounded-md bg-warning-tint px-3 py-2.5 text-sm text-warning">
            <ListOrdered className="size-4 shrink-0" />
            You&apos;re #{waitlistPosition} on the waitlist — we&apos;ll notify you the moment a spot opens.
          </div>
        )}

        {status === "booked" && (
          <div className="flex items-center gap-2.5 rounded-md bg-success-tint px-3 py-2.5 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            You&apos;re booked into this class.
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-md bg-danger-tint px-3 py-2.5 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>This overlaps {conflicts.map((c) => c.label).join(", ")} already on your schedule.</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Free cancellation up to 4 hours before class. Late cancellations count toward your monthly credit.
        </p>

        <Separator />
      </div>

      <Footer className="pt-2">
        {status ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => myBooking && cancelClassBooking(myBooking.id)}
          >
            {status === "waitlisted" ? "Leave Waitlist" : "Cancel Booking"}
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={conflicts.length > 0}
            onClick={() => {
              bookClass(live.id);
              setJustBooked(true);
            }}
          >
            {isFull ? "Join Waitlist" : "Book Class"}
          </Button>
        )}
      </Footer>
    </ResponsiveDialog>
  );
}
