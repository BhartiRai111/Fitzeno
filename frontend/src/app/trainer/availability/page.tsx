"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysOfWeek } from "@/lib/data/classes";
import { trainerAvailability as initialAvailability } from "@/lib/data/trainer-availability";
import type { GymClass, TrainerAvailabilitySlot } from "@/lib/data/types";

const TRAINER_ID = "tr-1";

export default function TrainerAvailabilityPage() {
  const [slots, setSlots] = React.useState<TrainerAvailabilitySlot[]>(
    initialAvailability.filter((a) => a.trainerId === TRAINER_ID)
  );
  const [addingDay, setAddingDay] = React.useState<GymClass["day"] | null>(null);
  const [start, setStart] = React.useState("09:00");
  const [end, setEnd] = React.useState("11:00");

  function addSlot(day: GymClass["day"]) {
    if (start >= end) {
      toast.error("End time must be after the start time");
      return;
    }
    setSlots((prev) => [...prev, { id: `av-${Date.now()}`, trainerId: TRAINER_ID, day, startTime: start, endTime: end }]);
    setAddingDay(null);
    toast.success("Availability added");
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    toast.success("Availability removed");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        description="Set the hours members can book personal training sessions with you."
      />

      <Card className="flex items-start gap-2.5 border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <CalendarClock className="mt-0.5 size-4 shrink-0" />
        Members only see slots inside these windows that don&apos;t clash with a class you teach or a session you
        already have booked.
      </Card>

      <div className="space-y-3">
        {daysOfWeek.map((day) => {
          const dayBlocks = slots.filter((s) => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <Card key={day} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="w-24 shrink-0 text-sm font-semibold text-foreground">{day}</p>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {dayBlocks.length === 0 && addingDay !== day && (
                    <span className="text-sm text-muted-foreground">No availability set</span>
                  )}
                  {dayBlocks.map((slot) => (
                    <span
                      key={slot.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-sm text-foreground"
                    >
                      {slot.startTime}–{slot.endTime}
                      <button
                        onClick={() => removeSlot(slot.id)}
                        className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        aria-label={`Remove ${day} ${slot.startTime}-${slot.endTime}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}

                  {addingDay === day ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="h-9 w-28"
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-28" />
                      <Button size="sm" onClick={() => addSlot(day)}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingDay(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingDay(day);
                        setStart("09:00");
                        setEnd("11:00");
                      }}
                    >
                      <Plus className="size-3.5" />
                      Add availability
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
