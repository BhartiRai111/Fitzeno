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
import { useAvailableSlots } from "@/hooks/use-pt-sessions";
import { trainers } from "@/lib/data/trainers";
import { formatDate } from "@/lib/utils-data";

interface BookPtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTrainerId?: string;
}

function nextDays(count: number): string[] {
  const days: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < count; i++) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const DATE_OPTIONS = nextDays(7);

export function BookPtDialog({ open, onOpenChange, preselectedTrainerId }: BookPtDialogProps) {
  const { bookPt } = useBookings();
  const [trainerId, setTrainerId] = React.useState<string | null>(preselectedTrainerId ?? null);
  const [date, setDate] = React.useState(DATE_OPTIONS[0]!);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmedSlot, setConfirmedSlot] = React.useState<{ startTime: string; date: string } | null>(null);

  React.useEffect(() => {
    // Intentional: reset trainer/date/slot selection each time this dialog is reopened.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrainerId(preselectedTrainerId ?? null);
      setDate(DATE_OPTIONS[0]!);
      setConfirmedSlot(null);
    }
  }, [open, preselectedTrainerId]);

  const trainer = trainerId ? trainers.find((t) => t.id === trainerId) : null;
  const { slots: freeSlots, isLoading: slotsLoading } = useAvailableSlots(trainerId, date);

  async function handleConfirm(slot: { startTime: string; endTime: string }) {
    if (!trainerId) return;
    setSubmitting(true);
    const ok = await bookPt({ trainerId, date, startTime: slot.startTime, duration: 45 });
    setSubmitting(false);
    if (ok) setConfirmedSlot({ startTime: slot.startTime, date });
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
                with {trainer.name} · {formatDate(confirmedSlot.date)} · {confirmedSlot.startTime}
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
              <DialogDescription>Pick a day and an available time — sessions run 45 minutes.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-1.5">
              {DATE_OPTIONS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={date === d ? "primary" : "outline"}
                  className="rounded-full"
                  onClick={() => setDate(d)}
                >
                  {new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}
                </Button>
              ))}
            </div>

            {slotsLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading available times…</p>
            ) : freeSlots.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="No open slots this day"
                description={`${trainer.name} is fully booked — try another day or choose a different trainer.`}
              />
            ) : (
              <ScrollArea className="max-h-96 -mx-1 px-1">
                <div className="space-y-2">
                  {freeSlots.map((slot) => (
                    <button
                      key={`${date}-${slot.startTime}`}
                      disabled={submitting}
                      onClick={() => handleConfirm(slot)}
                      className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Clock className="size-4 text-muted-foreground" />
                        {formatDate(date)}, {slot.startTime}–{slot.endTime}
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
