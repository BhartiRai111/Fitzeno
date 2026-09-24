import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClassDialog } from "@/components/dashboard/dialogs/class-dialog";
import { daysOfWeek } from "@/lib/data/classes";
import { trainers } from "@/lib/data/trainers";
import type { GymClass } from "@/lib/data/types";

const typeAccent: Record<GymClass["type"], string> = {
  HIIT: "border-warning",
  Yoga: "border-info",
  Strength: "border-primary",
  Spin: "border-success",
  Boxing: "border-danger",
  Mobility: "border-muted-foreground",
  Pilates: "border-info",
};

export function WeekCalendar({ classes }: { classes: GymClass[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {daysOfWeek.map((day) => {
        const dayClasses = classes
          .filter((c) => c.day === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <div key={day} className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</p>
            <div className="space-y-2">
              {dayClasses.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                  No classes
                </p>
              ) : (
                dayClasses.map((gymClass) => {
                  const trainer = trainers.find((t) => t.id === gymClass.trainerId);
                  return (
                    <ClassDialog
                      key={gymClass.id}
                      gymClass={gymClass}
                      trigger={
                        <button
                          type="button"
                          className={`w-full rounded-md border-l-4 bg-card p-2.5 text-left shadow-elevation-xs transition-colors hover:bg-muted/50 ${typeAccent[gymClass.type]}`}
                          title={`Edit ${gymClass.name}`}
                        >
                          <p className="truncate text-xs font-semibold text-foreground">{gymClass.name}</p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="size-3" />
                            {gymClass.startTime}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{trainer?.name}</p>
                          <Badge
                            variant={gymClass.booked >= gymClass.capacity ? "danger" : "default"}
                            className="mt-1"
                          >
                            {gymClass.booked}/{gymClass.capacity}
                          </Badge>
                        </button>
                      }
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
