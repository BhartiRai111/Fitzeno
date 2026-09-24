"use client";

import * as React from "react";
import { CalendarX2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { PortalClassCard } from "@/components/portal/portal-class-card";
import { ClassDetailSheet } from "@/components/portal/class-detail-sheet";
import { useBookings } from "@/components/portal/bookings-provider";
import { cn } from "@/lib/utils";
import { daysOfWeek } from "@/lib/data/classes";
import type { GymClass } from "@/lib/data/types";

const types: (GymClass["type"] | "All")[] = ["All", "HIIT", "Yoga", "Strength", "Spin", "Boxing", "Mobility", "Pilates"];

export default function PortalClassesPage() {
  const { classes } = useBookings();
  const [day, setDay] = React.useState<GymClass["day"] | "All">("All");
  const [type, setType] = React.useState<GymClass["type"] | "All">("All");
  const [selected, setSelected] = React.useState<GymClass | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const filtered = classes.filter(
    (c) => (day === "All" || c.day === day) && (type === "All" || c.type === type)
  );

  function openClass(gymClass: GymClass) {
    setSelected(gymClass);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Classes" description="Browse the weekly timetable and book your spot." />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-wrap gap-2">
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

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="No classes match your filters"
          description="Try a different day or class type to see what's on the schedule."
          action={{ label: "Reset filters", onClick: () => { setDay("All"); setType("All"); } }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((gymClass) => (
            <PortalClassCard key={gymClass.id} gymClass={gymClass} onOpen={openClass} />
          ))}
        </div>
      )}

      <ClassDetailSheet gymClass={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
