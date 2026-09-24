"use client";

import { Clock, MapPin, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { gymClasses, daysOfWeek } from "@/lib/data/classes";
import { ptSessions } from "@/lib/data/pt-sessions";
import { dayFromDate, DEMO_TRAINER_ID, TODAY_DAY } from "@/lib/booking-helpers";

const TRAINER_ID = DEMO_TRAINER_ID;

export default function TrainerSchedulePage() {
  const myClasses = gymClasses.filter((c) => c.trainerId === TRAINER_ID);
  const myPt = ptSessions.filter((s) => s.trainerId === TRAINER_ID && s.status !== "cancelled");

  return (
    <div className="space-y-6">
      <PageHeader title="My Schedule" description="Classes you teach and personal training sessions, this week." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {daysOfWeek.map((day) => {
          const dayClasses = myClasses
            .filter((c) => c.day === day)
            .map((c) => ({
              key: c.id,
              time: c.startTime,
              title: c.name,
              subtitle: c.location,
              badge: `${c.booked}/${c.capacity}`,
              full: c.booked >= c.capacity,
              kind: "class" as const,
            }));
          const dayPt = myPt
            .filter((s) => dayFromDate(s.date) === day)
            .map((s) => ({
              key: s.id,
              time: s.startTime,
              title: `PT · ${s.memberName}`,
              subtitle: `${s.duration} min`,
              status: s.status,
              kind: "pt" as const,
            }));
          const items = [...dayClasses, ...dayPt].sort((a, b) => a.time.localeCompare(b.time));

          return (
            <div key={day} className="min-w-0">
              <p
                className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                  day === TODAY_DAY ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {day}
                {day === TODAY_DAY && " · today"}
              </p>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                    Nothing scheduled
                  </p>
                ) : (
                  items.map((item) => (
                    <Card
                      key={item.key}
                      className={`p-2.5 ${item.kind === "class" ? "border-l-4 border-l-primary" : "border-l-4 border-l-accent-foreground/30"}`}
                    >
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-3" />
                        {item.time}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{item.title}</p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        {item.kind === "class" ? <MapPin className="size-3" /> : <UserRound className="size-3" />}
                        {item.subtitle}
                      </p>
                      {item.kind === "class" ? (
                        <Badge variant={item.full ? "danger" : "default"} className="mt-1.5">
                          {item.badge}
                        </Badge>
                      ) : (
                        <div className="mt-1.5">
                          <BookingStatusBadge status={item.status} />
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
