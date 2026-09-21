"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, Users, Star, TrendingUp, Clock, MapPin, ArrowRight, CheckCircle2, CalendarX2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { gymClasses, daysOfWeek } from "@/lib/data/classes";
import { ptSessions as initialPtSessions } from "@/lib/data/pt-sessions";
import { trainerPerformance } from "@/lib/data/reports";

const TRAINER_ID = "tr-1";
const TODAY_DAY: (typeof daysOfWeek)[number] = "Mon";
const TODAY_ISO = "2026-09-21";

export default function TrainerDashboardPage() {
  const [ptSessions, setPtSessions] = React.useState(initialPtSessions);

  const perf = trainerPerformance.find((p) => p.trainerId === TRAINER_ID);
  const myClasses = gymClasses.filter((c) => c.trainerId === TRAINER_ID);
  const todaysClasses = myClasses.filter((c) => c.day === TODAY_DAY);
  const todaysPt = ptSessions.filter((s) => s.trainerId === TRAINER_ID && s.date === TODAY_ISO);

  const agenda = [
    ...todaysClasses.map((c) => ({
      key: c.id,
      time: c.startTime,
      title: c.name,
      subtitle: `Class · ${c.location} · ${c.booked}/${c.capacity} booked`,
      kind: "class" as const,
    })),
    ...todaysPt.map((s) => ({
      key: s.id,
      time: s.startTime,
      title: `PT with ${s.memberName}`,
      subtitle: `Personal training · ${s.duration} min`,
      kind: "pt" as const,
      session: s,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const weekAhead = daysOfWeek.map((day) => ({
    day,
    classCount: myClasses.filter((c) => c.day === day).length,
  }));

  function markAttended(sessionId: string) {
    setPtSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: "attended" } : s)));
    toast.success("Marked as attended");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning, Maya"
        description="Here's your day at Fitzeno — Riverside District, Monday 21 September."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Classes Today" value={todaysClasses.length.toString()} icon={CalendarDays} />
        <StatCard label="PT Sessions Today" value={todaysPt.length.toString()} icon={Users} />
        <StatCard label="Sessions This Month" value={(perf?.sessionsRun ?? 0).toString()} icon={TrendingUp} />
        <StatCard label="Average Rating" value={perf ? perf.avgRating.toFixed(1) : "—"} icon={Star} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Today&apos;s agenda</CardTitle>
              <CardDescription>Monday, September 21</CardDescription>
            </div>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/trainer/schedule">
                  Full schedule
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {agenda.length === 0 ? (
              <EmptyState icon={CalendarX2} title="Nothing scheduled today" description="Enjoy the rest of your day." />
            ) : (
              <div className="space-y-1">
                {agenda.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex w-16 shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Clock className="size-3.5" />
                      {item.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                    {item.kind === "pt" && item.session.status === "booked" ? (
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => markAttended(item.session.id)}>
                        <CheckCircle2 className="size-3.5" />
                        Mark Attended
                      </Button>
                    ) : item.kind === "pt" ? (
                      <BookingStatusBadge status={item.session.status} />
                    ) : (
                      <Badge variant={item.title.includes("Full") ? "danger" : "default"}>Class</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>Classes you&apos;re teaching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {weekAhead.map(({ day, classCount }) => (
              <div key={day} className="flex items-center justify-between rounded-md px-2 py-2 text-sm">
                <span className={day === TODAY_DAY ? "font-semibold text-foreground" : "text-muted-foreground"}>
                  {day}
                  {day === TODAY_DAY && <span className="ml-1.5 text-xs text-primary">(today)</span>}
                </span>
                <span className="tabular text-muted-foreground">
                  {classCount > 0 ? `${classCount} class${classCount > 1 ? "es" : ""}` : "—"}
                </span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
              <Link href="/trainer/availability">
                <MapPin className="size-4" />
                Manage availability
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
