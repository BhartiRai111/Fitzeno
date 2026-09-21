"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CapacityBar } from "@/components/shared/capacity-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarX2 } from "lucide-react";
import { useBookings } from "@/components/portal/bookings-provider";
import { trainers } from "@/lib/data/trainers";
import { formatOccurrence } from "@/lib/booking-helpers";
import type { ClassBooking } from "@/lib/data/types";

interface RescheduleClassDialogProps {
  booking: ClassBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescheduleClassDialog({ booking, open, onOpenChange }: RescheduleClassDialogProps) {
  const { classes, getStatusForClass, rescheduleClassBooking } = useBookings();

  if (!booking) return null;

  const currentClass = classes.find((c) => c.id === booking.classId);
  const alternatives = classes
    .filter((c) => c.id !== booking.classId && c.name === currentClass?.name)
    .concat(classes.filter((c) => c.id !== booking.classId && c.name !== currentClass?.name))
    .filter((c) => !getStatusForClass(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule booking</DialogTitle>
          <DialogDescription>
            Pick a new class time — your spot in {currentClass?.name} will be released.
          </DialogDescription>
        </DialogHeader>

        {alternatives.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No alternative slots"
            description="You're already booked into everything else on the timetable this week."
          />
        ) : (
          <ScrollArea className="max-h-96 -mx-1 px-1">
            <div className="space-y-2">
              {alternatives.map((gymClass) => {
                const trainer = trainers.find((t) => t.id === gymClass.trainerId);
                const isFull = gymClass.booked >= gymClass.capacity;
                return (
                  <button
                    key={gymClass.id}
                    onClick={() => {
                      rescheduleClassBooking(booking.id, gymClass.id);
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{gymClass.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        {formatOccurrence(gymClass.day)} · {gymClass.startTime} · with {trainer?.name}
                      </p>
                      <div className="mt-2 max-w-40">
                        <CapacityBar booked={gymClass.booked} capacity={gymClass.capacity} />
                      </div>
                    </div>
                    <Badge variant={isFull ? "warning" : "default"} className="shrink-0">
                      {isFull ? "Waitlist" : "Select"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
