"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Undo2,
  Users,
  ClipboardCheck,
  UserX,
  Clock,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { gymClasses } from "@/lib/data/classes";
import { classBookings as initialClassBookings } from "@/lib/data/class-bookings";
import { ptSessions as initialPtSessions } from "@/lib/data/pt-sessions";
import { formatDate } from "@/lib/utils-data";
import { DEMO_TRAINER_ID, TODAY, TODAY_DAY } from "@/lib/booking-helpers";
import type { ClassBooking, PtSession } from "@/lib/data/types";

const TRAINER_ID = DEMO_TRAINER_ID;
const TODAY_ISO = TODAY;

export default function TrainerAttendancePage() {
  const [classBookings, setClassBookings] = React.useState<ClassBooking[]>(initialClassBookings);
  const [ptSessions, setPtSessions] = React.useState<PtSession[]>(initialPtSessions);

  const todaysClasses = gymClasses.filter((c) => c.trainerId === TRAINER_ID && c.day === TODAY_DAY);
  const todaysPt = ptSessions.filter((s) => s.trainerId === TRAINER_ID && s.date === TODAY_ISO);

  const classRosters = todaysClasses.map((c) => ({
    gymClass: c,
    roster: classBookings.filter((b) => b.classId === c.id && (b.status === "booked" || b.status === "attended" || b.status === "no-show")),
  }));

  const totalRoster = classRosters.reduce((sum, r) => sum + r.roster.length, 0);
  const totalMarked = classRosters.reduce(
    (sum, r) => sum + r.roster.filter((b) => b.status === "attended" || b.status === "no-show").length,
    0
  );
  const totalNoShows =
    classRosters.reduce((sum, r) => sum + r.roster.filter((b) => b.status === "no-show").length, 0) +
    todaysPt.filter((s) => s.status === "no-show").length;

  const pastPt = ptSessions
    .filter((s) => s.trainerId === TRAINER_ID && s.date < TODAY_ISO)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  function markClass(bookingId: string, status: "attended" | "no-show" | "booked") {
    setClassBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    const booking = classBookings.find((b) => b.id === bookingId);
    if (status !== "booked" && booking) {
      toast.success(`${booking.memberName} marked ${status === "attended" ? "present" : "no-show"}`);
    }
  }

  function markPt(sessionId: string, status: "attended" | "no-show" | "booked") {
    setPtSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status } : s)));
    const session = ptSessions.find((s) => s.id === sessionId);
    if (status !== "booked" && session) {
      toast.success(`${session.memberName} marked ${status === "attended" ? "present" : "no-show"}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark who showed up to your classes and sessions today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Classes Today" value={todaysClasses.length.toString()} icon={ClipboardCheck} />
        <StatCard label="Roster Marked" value={`${totalMarked}/${totalRoster}`} icon={Users} helpText="attendance recorded" />
        <StatCard label="No-shows Today" value={totalNoShows.toString()} icon={UserX} />
        <StatCard label="PT Sessions Today" value={todaysPt.length.toString()} icon={Clock} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-foreground">Today&apos;s classes</h2>
        {classRosters.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No classes today" description="You're not teaching any classes today." />
        ) : (
          <div className="space-y-4">
            {classRosters.map(({ gymClass, roster }) => (
              <Card key={gymClass.id} className="overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{gymClass.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      {gymClass.startTime} · {gymClass.duration} min
                      <MapPin className="ml-1.5 size-3.5" />
                      {gymClass.location}
                    </p>
                  </div>
                  <Badge variant="outline">{roster.length} booked</Badge>
                </div>
                {roster.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">No one booked into this class yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {roster.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className="text-xs">{entry.memberInitials}</AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm font-medium text-foreground">{entry.memberName}</span>
                        </div>
                        {entry.status === "booked" ? (
                          <div className="flex shrink-0 gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => markClass(entry.id, "attended")}>
                              <CheckCircle2 className="size-3.5" />
                              Present
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => markClass(entry.id, "no-show")}>
                              <XCircle className="size-3.5" />
                              No-show
                            </Button>
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <BookingStatusBadge status={entry.status} />
                            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => markClass(entry.id, "booked")} aria-label={`Revert ${entry.memberName} to booked`}>
                              <Undo2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-foreground">Personal training today</h2>
        {todaysPt.length === 0 ? (
          <EmptyState icon={Users} title="No PT sessions today" description="Nothing booked with you today." />
        ) : (
          <Card className="divide-y divide-border p-0">
            {todaysPt.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-xs">{session.memberInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{session.memberName}</p>
                    <p className="text-xs text-muted-foreground">{session.startTime} · {session.duration} min</p>
                  </div>
                </div>
                {session.status === "booked" ? (
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => markPt(session.id, "attended")}>
                      <CheckCircle2 className="size-3.5" />
                      Present
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => markPt(session.id, "no-show")}>
                      <XCircle className="size-3.5" />
                      No-show
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <BookingStatusBadge status={session.status} />
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => markPt(session.id, "booked")} aria-label={`Revert ${session.memberName} to booked`}>
                      <Undo2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent PT attendance</CardTitle>
          <CardDescription>Your last sessions with members</CardDescription>
        </CardHeader>
        <CardContent>
          {pastPt.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No attendance history yet" description="Past sessions will show up here." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 font-medium">Member</th>
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Time</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastPt.slice(0, 8).map((session) => (
                    <tr key={session.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[11px]">{session.memberInitials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{session.memberName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{formatDate(session.date)}</td>
                      <td className="py-2.5 tabular text-muted-foreground">{session.startTime}</td>
                      <td className="py-2.5"><BookingStatusBadge status={session.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
