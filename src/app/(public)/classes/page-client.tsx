"use client";

import * as React from "react";
import { CalendarX2 } from "lucide-react";
import { ClassCard } from "@/components/public/class-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { gymClasses, daysOfWeek } from "@/lib/data/classes";
import type { GymClass } from "@/lib/data/types";

const types: (GymClass["type"] | "All")[] = [
  "All",
  "HIIT",
  "Yoga",
  "Strength",
  "Spin",
  "Boxing",
  "Mobility",
  "Pilates",
];

export function ClassesPageClient() {
  const [day, setDay] = React.useState<GymClass["day"] | "All">("All");
  const [type, setType] = React.useState<GymClass["type"] | "All">("All");

  const filtered = gymClasses.filter(
    (c) => (day === "All" || c.day === day) && (type === "All" || c.type === type)
  );

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {(["All", ...daysOfWeek] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={day === d ? "primary" : "outline"}
              className="rounded-full"
              onClick={() => setDay(d)}
            >
              {d}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {types.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={type === t ? "secondary" : "ghost"}
              className={cn("rounded-full", type === t && "ring-1 ring-primary/40")}
              onClick={() => setType(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((gymClass) => (
            <ClassCard key={gymClass.id} gymClass={gymClass} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-10"
          icon={CalendarX2}
          title="No classes match your filters"
          description="Try a different day or class type to see what's on the schedule."
          action={{ label: "Reset filters", onClick: () => { setDay("All"); setType("All"); } }}
        />
      )}
    </div>
  );
}
