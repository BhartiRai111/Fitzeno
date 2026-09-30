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
import { useAuth } from "@/lib/auth/auth-context";
import { useClassOccurrences } from "@/hooks/use-classes";
import { useClassBookingsRoster, useMarkClassAttendance } from "@/hooks/use-class-bookings";
import { usePtSessionsRoster, useMarkPtAttendance } from "@/hooks/use-pt-sessions";
import { toInitials } from "@/lib/api/enum-maps";
import { ApiError, NetworkError } from "@/lib/api/types";
import { formatDate } from "@/lib/utils-data";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof NetworkError ? err.message : fallback;
}

export default function TrainerAttendancePage() {
  const { user } = useAuth();
  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayIso = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const { classes: todaysClasses, isLoading: classesLoading } = useClassOccurrences({
    trainerId: user?.id,
    from: todayIso,
    to: todayIso,
  });
  const { raw: allBookings, isLoading: bookingsLoading } = useClassBookingsRoster({ limit: 200 });
  const { sessions: todaysPt, isLoading: ptLoading } = usePtSessionsRoster({ from: todayIso, to: todayIso });
  const { sessions: pastPt } = usePtSessionsRoster({ to: yesterdayIso, limit: 20 });

  const markClassAttendance = useMarkClassAttendance();
  const markPtAttendance = useMarkPtAttendance();

  const classRosters = todaysClasses.map((gymClass) => ({
    gymClass,
    roster: allBookings
      .filter((b) => b.classOccurrence.id === gymClass.id && (b.status === "CONFIRMED" || b.status === "ATTENDED" || b.status === "NO_SHOW"))
      .map((b) => ({
        id: b.id,
        memberName: `${b.member.firstName} ${b.member.lastName}`,
        memberInitials: toInitials(b.member.firstName, b.member.lastName),
        status: b.status === "CONFIRMED" ? ("booked" as const) : b.status === "ATTENDED" ? ("attended" as const) : ("no-show" as const),
      })),
  }));

  const totalRoster = classRosters.reduce((sum, r) => sum + r.roster.length, 0);
  const totalMarked = classRosters.reduce(
    (sum, r) => sum + r.roster.filter((b) => b.status === "attended" || b.status === "no-show").length,
    0
  );
  const todaysActivePt = todaysPt.filter((s) => s.status !== "cancelled");
  const totalNoShows =
    classRosters.reduce((sum, r) => sum + r.roster.filter((b) => b.status === "no-show").length, 0) +
    todaysActivePt.filter((s) => s.status === "no-show").length;

  function markClass(bookingId: string, status: "attended" | "no-show" | "booked", memberName: string) {
    const backendStatus = status === "attended" ? "ATTENDED" : status === "no-show" ? "NO_SHOW" : "CONFIRMED";
    markClassAttendance.mutate(
      { id: bookingId, status: backendStatus },
      {
        onSuccess: () => {
          if (status !== "booked") toast.success(`${memberName} marked ${status === "attended" ? "present" : "no-show"}`);
        },
        onError: (err) => toast.error(errorMessage(err, "Couldn't update attendance. Please try again.")),
      }
    );
  }

  function markPt(sessionId: string, status: "attended" | "no-show" | "booked", memberName: string) {
    const backendStatus = status === "attended" ? "COMPLETED" : status === "no-show" ? "NO_SHOW" : "CONFIRMED";
    markPtAttendance.mutate(
      { id: sessionId, status: backendStatus },
      {
        onSuccess: () => {
          if (status !== "booked") toast.success(`${memberName} marked ${status === "attended" ? "present" : "no-show"}`);
        },
        onError: (err) => toast.error(errorMessage(err, "Couldn't update attendance. Please try again.")),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark who showed up to your classes and sessions today." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Classes Today" value={todaysClasses.length.toString()} icon={ClipboardCheck} />
        <StatCard label="Roster Marked" value={`${totalMarked}/${totalRoster}`} icon={Users} helpText="attendance recorded" />
        <StatCard label="No-shows Today" value={totalNoShows.toString()} icon={UserX} />
        <StatCard label="PT Sessions Today" value={todaysActivePt.length.toString()} icon={Clock} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-foreground">Today&apos;s classes</h2>
        {classesLoading || bookingsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : classRosters.length === 0 ? (
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
                            <Button size="sm" variant="outline" onClick={() => markClass(entry.id, "attended", entry.memberName)}>
                              <CheckCircle2 className="size-3.5" />
                              Present
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => markClass(entry.id, "no-show", entry.memberName)}>
                              <XCircle className="size-3.5" />
                              No-show
                            </Button>
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <BookingStatusBadge status={entry.status} />
                            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => markClass(entry.id, "booked", entry.memberName)} aria-label={`Revert ${entry.memberName} to booked`}>
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
        {ptLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : todaysActivePt.length === 0 ? (
          <EmptyState icon={Users} title="No PT sessions today" description="Nothing booked with you today." />
        ) : (
          <Card className="divide-y divide-border p-0">
            {todaysActivePt.map((session) => (
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
                    <Button size="sm" variant="outline" onClick={() => markPt(session.id, "attended", session.memberName)}>
                      <CheckCircle2 className="size-3.5" />
                      Present
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => markPt(session.id, "no-show", session.memberName)}>
                      <XCircle className="size-3.5" />
                      No-show
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <BookingStatusBadge status={session.status} />
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => markPt(session.id, "booked", session.memberName)} aria-label={`Revert ${session.memberName} to booked`}>
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
                  {[...pastPt].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((session) => (
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
