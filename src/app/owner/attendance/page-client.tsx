"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { QrCode, CalendarX2, UserCheck } from "lucide-react";
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
import { members } from "@/lib/data/members";
import { attendanceRecords, weeklyAttendance } from "@/lib/data/attendance";
import { formatDate } from "@/lib/utils-data";
import { Users, Clock, TrendingUp } from "lucide-react";

const TODAY = "2026-09-21";
const availableDates = Array.from(new Set(attendanceRecords.map((r) => r.date))).sort().reverse();

type TabValue = "today" | "history" | "checkins" | "qr";

export function AttendancePageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "today";
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  const [historyDate, setHistoryDate] = React.useState(TODAY);
  const [memberFilter, setMemberFilter] = React.useState("all");

  const [manualMember, setManualMember] = React.useState(members[0]?.id);
  const [manualLog, setManualLog] = React.useState<{ id: string; name: string; time: string }[]>([]);

  const todaysRecords = attendanceRecords.filter((r) => r.date === TODAY);
  const stillIn = todaysRecords.filter((r) => !r.checkOutTime).length;
  const weeklyAvg = Math.round(weeklyAttendance.reduce((sum, d) => sum + d.visits, 0) / weeklyAttendance.length);

  const historyRecords = attendanceRecords.filter(
    (r) => r.date === historyDate && (memberFilter === "all" || r.memberId === memberFilter)
  );

  function handleManualCheckIn() {
    const member = members.find((m) => m.id === manualMember);
    if (!member) return;
    setManualLog((prev) => [
      { id: `${Date.now()}`, name: member.name, time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
      ...prev,
    ]);
    toast.success(`${member.name} checked in`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Check-ins, history, and attendance analytics" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="today">Today&apos;s Attendance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          <TabsTrigger value="qr">QR Check-in</TabsTrigger>
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
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
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
        </TabsContent>

        <TabsContent value="checkins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual check-in</CardTitle>
              <CardDescription>Check a member in from the front desk (e.g. forgotten phone).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Select value={manualMember} onValueChange={setManualMember}>
                <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="Search member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleManualCheckIn}>
                <UserCheck className="size-4" />
                Check In
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent manual check-ins</CardTitle></CardHeader>
            <CardContent>
              {manualLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No manual check-ins logged this session.</p>
              ) : (
                <div className="space-y-1">
                  {manualLog.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40">
                      <span className="text-sm font-medium text-foreground">{entry.name}</span>
                      <span className="text-xs tabular text-muted-foreground">{entry.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr">
          <Card className="mx-auto flex max-w-sm flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-40 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40">
              <QrCode className="size-24 text-foreground" strokeWidth={1} />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-foreground">Front desk kiosk code</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Members scan their own membership QR from the Fitzeno app against this reader to check in instantly.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
