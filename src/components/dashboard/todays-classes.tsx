import { Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CapacityBar } from "@/components/shared/capacity-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarX2 } from "lucide-react";
import { trainers } from "@/lib/data/trainers";
import { classBookings } from "@/lib/data/class-bookings";
import type { GymClass } from "@/lib/data/types";

export function TodaysClasses({ classes }: { classes: GymClass[] }) {
  if (classes.length === 0) {
    return (
      <EmptyState icon={CalendarX2} title="No classes today" description="Nothing scheduled for today." />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classes.map((gymClass) => {
        const trainer = trainers.find((t) => t.id === gymClass.trainerId);
        const waitlistCount = classBookings.filter(
          (b) => b.classId === gymClass.id && b.status === "waitlisted"
        ).length;
        const isFull = gymClass.booked >= gymClass.capacity;

        return (
          <Card key={gymClass.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-display text-sm font-semibold text-foreground">{gymClass.name}</h4>
                <p className="text-xs text-muted-foreground">with {trainer?.name}</p>
              </div>
              <Badge variant={isFull ? "danger" : "success"}>{isFull ? "Full" : "Open"}</Badge>
            </div>
            <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {gymClass.startTime} · {gymClass.duration} min
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {gymClass.location}
              </div>
            </div>
            <div className="mt-3">
              <CapacityBar booked={gymClass.booked} capacity={gymClass.capacity} />
            </div>
            {waitlistCount > 0 && (
              <p className="mt-2 text-xs font-medium text-warning">Waitlist: {waitlistCount}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
