"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Star, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarX2 } from "lucide-react";
import { useBookings } from "@/components/portal/bookings-provider";
import { trainers } from "@/lib/data/trainers";
import { getTrainerFreeSlots, formatOccurrence, type FreeSlot } from "@/lib/booking-helpers";
import { formatDate } from "@/lib/utils-data";

interface BookPtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTrainerId?: string;
}

export function BookPtDialog({ open, onOpenChange, preselectedTrainerId }: BookPtDialogProps) {
  const { classes, ptSessions, bookPt } = useBookings();
  const [trainerId, setTrainerId] = React.useState<string | null>(preselectedTrainerId ?? null);
  const [confirmedSlot, setConfirmedSlot] = React.useState<FreeSlot | null>(null);

  React.useEffect(() => {
    // Intentional: reset trainer/slot selection each time this dialog is reopened.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrainerId(preselectedTrainerId ?? null);
      setConfirmedSlot(null);
    }
  }, [open, preselectedTrainerId]);

  const trainer = trainerId ? trainers.find((t) => t.id === trainerId) : null;
  const freeSlots = trainerId ? getTrainerFreeSlots(classes, ptSessions, trainerId) : [];

  function handleConfirm(slot: FreeSlot) {
    if (!trainerId) return;
    bookPt({ trainerId, day: slot.day, occurrenceDate: slot.occurrenceDate, startTime: slot.startTime, duration: 45 });
    setConfirmedSlot(slot);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {confirmedSlot && trainer ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
              <CheckCircle2 className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">Session booked!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                with {trainer.name} · {formatDate(confirmedSlot.occurrenceDate)} · {confirmedSlot.startTime}
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
        ) : trainerId && trainer ? (
          <>
            <DialogHeader>
              {!preselectedTrainerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 w-fit"
                  onClick={() => setTrainerId(null)}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              )}
              <DialogTitle>Book with {trainer.name}</DialogTitle>
              <DialogDescription>Pick an available time — sessions run 45 minutes.</DialogDescription>
            </DialogHeader>
            {freeSlots.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="No open slots this week"
                description={`${trainer.name} is fully booked — try again next week or choose a different trainer.`}
              />
            ) : (
              <ScrollArea className="max-h-96 -mx-1 px-1">
                <div className="space-y-2">
                  {freeSlots.map((slot) => (
                    <button
                      key={`${slot.occurrenceDate}-${slot.startTime}`}
                      onClick={() => handleConfirm(slot)}
                      className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Clock className="size-4 text-muted-foreground" />
                        {formatOccurrence(slot.day)}, {slot.startTime}–{slot.endTime}
                      </span>
                      <Badge variant="primary">Book</Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Book a personal trainer</DialogTitle>
              <DialogDescription>Choose a coach to see their available times.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96 -mx-1 px-1">
              <div className="space-y-2">
                {trainers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTrainerId(t.id)}
                    className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback>{t.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.role}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3.5 fill-brand-lime text-brand-lime" />
                      {t.rating}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
