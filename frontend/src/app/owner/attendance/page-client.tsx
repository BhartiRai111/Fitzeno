"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  QrCode,
  CalendarX2,
  UserCheck,
  Users,
  Clock,
  TrendingUp,
  ShieldCheck,
  Ban,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { PeakHoursChart } from "@/components/dashboard/charts/peak-hours-chart";
import { WeeklyAttendanceChart } from "@/components/dashboard/charts/weekly-attendance-chart";
import { MonthlyAttendanceChart } from "@/components/dashboard/charts/monthly-attendance-chart";
import { AtRiskMembers } from "@/components/dashboard/at-risk-members";
import { members } from "@/lib/data/members";
import { attendanceRecords as initialRecords, weeklyAttendance } from "@/lib/data/attendance";
import { gymClasses } from "@/lib/data/classes";
import { classBookings } from "@/lib/data/class-bookings";
import { trainers } from "@/lib/data/trainers";
import { formatDate, daysBetween } from "@/lib/utils-data";
import { TODAY, getMembershipBlock, nowTimeLabel } from "@/lib/attendance-helpers";
import type { AttendanceRecord } from "@/lib/data/types";

const availableDates = Array.from(new Set(initialRecords.map((r) => r.date))).sort().reverse();
const TODAY_DAY = "Mon" as const;

type TabValue = "today" | "history" | "insights" | "checkin";
type TrendView = "weekly" | "monthly";

export function AttendancePageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "today";
  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const [trend, setTrend] = React.useState<TrendView>("weekly");

  const [records, setRecords] = React.useState<AttendanceRecord[]>(initialRecords);

  const [historyDate, setHistoryDate] = React.useState(TODAY);
  const [memberFilter, setMemberFilter] = React.useState("all");

  const [manualMemberId, setManualMemberId] = React.useState(members[0]?.id);

  const todaysRecords = React.useMemo(
    () => records.filter((r) => r.date === TODAY).sort((a, b) => b.checkInTime.localeCompare(a.checkInTime)),
    [records]
  );
  const stillIn = todaysRecords.filter((r) => !r.checkOutTime).length;
  const weeklyAvg = Math.round(weeklyAttendance.reduce((sum, d) => sum + d.visits, 0) / weeklyAttendance.length);

  const historyRecords = records.filter(
    (r) => r.date === historyDate && (memberFilter === "all" || r.memberId === memberFilter)
  );

  const todaysClasses = gymClasses.filter((c) => c.day === TODAY_DAY);
  const classAttendance = todaysClasses.map((c) => {
    const roster = classBookings.filter((b) => b.classId === c.id && b.status !== "cancelled" && b.status !== "waitlisted");
    const attended = roster.filter((b) => b.status === "attended").length;
    const noShow = roster.filter((b) => b.status === "no-show").length;
    const pending = roster.filter((b) => b.status === "booked").length;
    return { gymClass: c, roster, attended, noShow, pending };
  });

  const inactive14Plus = members.filter((m) => daysBetween(m.lastCheckIn, TODAY) >= 14);
  const mostActive = [...members].sort((a, b) => b.attendanceThisMonth - a.attendanceThisMonth).slice(0, 6);
  const avgVisitsPerMember = Math.round(
    (members.reduce((sum, m) => sum + m.attendanceThisMonth, 0) / members.length) * 10
  ) / 10;

  const manualMember = members.find((m) => m.id === manualMemberId);
  const manualBlock = manualMember ? getMembershipBlock(manualMember.status) : null;
  const manualAlreadyIn = manualMember
    ? todaysRecords.find((r) => r.memberId === manualMember.id)
    : undefined;

  function handleManualCheckIn() {
    if (!manualMember || manualBlock) return;
    const time = nowTimeLabel();
    const newRecord: AttendanceRecord = {
      id: `at-${Date.now()}`,
      memberId: manualMember.id,
      memberName: manualMember.name,
      memberInitials: manualMember.initials,
      plan: manualMember.plan,
      date: TODAY,
      checkInTime: time,
      checkOutTime: null,
      method: "Manual",
    };
    setRecords((prev) => [newRecord, ...prev]);
    toast.success(`${manualMember.name} checked in`, { description: `Front desk · ${time}` });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Check-ins, history, and attendance analytics" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="checkin">Check-in Desk</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Checked in today" value={todaysRecords.length.toString()} icon={Users} />
            <StatCard label="Currently at gym" value={stillIn.toString()} icon={Clock} />
            <StatCard label="Weekly average" value={weeklyAvg.toString()} icon={TrendingUp} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Peak hours today</CardTitle>
            </CardHeader>
            <CardContent><PeakHoursChart /></CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s class attendance</CardTitle>
              <CardDescription>Marked by trainers as classes run</CardDescription>
            </CardHeader>
            <CardContent>
              {classAttendance.length === 0 ? (
                <EmptyState icon={CalendarX2} title="No classes today" description="Nothing scheduled for today." className="border-0" />
              ) : (
                <div className="space-y-1">
                  {classAttendance.map(({ gymClass, roster, attended, noShow, pending }) => {
                    const trainer = trainers.find((t) => t.id === gymClass.trainerId);
                    return (
                      <div key={gymClass.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-muted/40">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{gymClass.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {gymClass.startTime} · with {trainer?.name} · {roster.length} booked
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {attended > 0 && <Badge variant="success">{attended} attended</Badge>}
                          {noShow > 0 && <Badge variant="danger">{noShow} no-show</Badge>}
                          {pending > 0 && <Badge variant="outline">{pending} pending</Badge>}
                          {roster.length === 0 && <Badge variant="outline">No bookings</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {todaysRecords.length === 0 ? (
            <EmptyState icon={CalendarX2} title="No check-ins yet today" description="Check-ins will appear here as members arrive." />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Membership</th>
                      <th className="px-4 py-3 font-medium">Check-in</th>
                      <th className="px-4 py-3 font-medium">Check-out</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysRecords.map((record) => (
                      <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">{record.memberInitials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{record.memberName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{record.plan}</td>
                        <td className="px-4 py-3 tabular text-muted-foreground">{record.checkInTime}</td>
                        <td className="px-4 py-3 tabular text-muted-foreground">{record.checkOutTime ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{record.method}</td>
                        <td className="px-4 py-3">
                          <Badge variant={record.checkOutTime ? "default" : "success"}>
                            {record.checkOutTime ? "Checked out" : "At gym"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Select value={historyDate} onValueChange={setHistoryDate}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableDates.map((d) => (
                    <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="sm:w-52"><SelectValue placeholder="Member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
          {historyRecords.length === 0 ? (
            <EmptyState icon={CalendarX2} title="No records" description="No attendance recorded for this date." />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Membership</th>
                      <th className="px-4 py-3 font-medium">Check-in</th>
                      <th className="px-4 py-3 font-medium">Check-out</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((record) => (
                      <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{record.memberName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{record.plan}</td>
                        <td className="px-4 py-3 tabular text-muted-foreground">{record.checkInTime}</td>
                        <td className="px-4 py-3 tabular text-muted-foreground">{record.checkOutTime ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{record.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Attendance trend</CardTitle>
                <CardDescription>{trend === "weekly" ? "Last 7 days" : "Last 6 months"}</CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-muted/60 p-1">
                <Button
                  size="sm"
                  variant={trend === "weekly" ? "secondary" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setTrend("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  size="sm"
                  variant={trend === "monthly" ? "secondary" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setTrend("monthly")}
                >
                  Monthly
                </Button>
              </div>
            </CardHeader>
            <CardContent>{trend === "weekly" ? <WeeklyAttendanceChart /> : <MonthlyAttendanceChart />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Inactive 14+ days" value={inactive14Plus.length.toString()} icon={AlertCircle} />
            <StatCard label="Avg. visits / member" value={avgVisitsPerMember.toString()} icon={TrendingUp} helpText="this month" />
            <StatCard label="Most active member" value={mostActive[0]?.attendanceThisMonth.toString() ?? "0"} icon={ShieldCheck} helpText={mostActive[0]?.name} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Most active this month</CardTitle>
                <CardDescription>Ranked by total visits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {mostActive.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                    <span className="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground">{i + 1}</span>
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.plan}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular text-foreground">{member.attendanceThisMonth}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members at risk</CardTitle>
                <CardDescription>Haven&apos;t checked in recently</CardDescription>
              </CardHeader>
              <CardContent>
                <AtRiskMembers members={members} today={TODAY} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="checkin" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Manual check-in</CardTitle>
                <CardDescription>Check a member in from the front desk (e.g. forgotten phone).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={manualMemberId} onValueChange={setManualMemberId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Search member" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {manualBlock ? (
                  <div className="flex items-start gap-2.5 rounded-md bg-danger-tint px-3 py-2.5 text-sm text-danger">
                    <Ban className="mt-0.5 size-4 shrink-0" />
                    <span>{manualBlock.title} — {manualBlock.detail}</span>
                  </div>
                ) : manualAlreadyIn ? (
                  <div className="flex items-start gap-2.5 rounded-md bg-warning-tint px-3 py-2.5 text-sm text-warning">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>Already checked in today at {manualAlreadyIn.checkInTime}. Checking in again logs a new visit.</span>
                  </div>
                ) : null}

                <Button onClick={handleManualCheckIn} disabled={!manualMember || !!manualBlock}>
                  <UserCheck className="size-4" />
                  {manualAlreadyIn ? "Check In Again" : "Check In"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Recent check-ins</CardTitle></CardHeader>
              <CardContent>
                {todaysRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No check-ins logged yet today.</p>
                ) : (
                  <div className="space-y-1">
                    {todaysRecords.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[11px]">{entry.memberInitials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{entry.memberName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px]">{entry.method}</Badge>
                          <span className="text-xs tabular text-muted-foreground">{entry.checkInTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mx-auto flex max-w-sm flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-40 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40">
              <QrCode className="size-24 text-foreground" strokeWidth={1} />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-foreground">Front desk kiosk code</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Members scan their own membership QR from the Fitzeno app against this reader to check in instantly.
                If a code won&apos;t scan, use manual check-in instead.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
