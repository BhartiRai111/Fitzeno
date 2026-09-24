"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, ArrowRight, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { MembershipDistributionChart } from "@/components/dashboard/charts/membership-distribution-chart";
import { MemberGrowthChart } from "@/components/dashboard/charts/member-growth-chart";
import { WeeklyAttendanceChart } from "@/components/dashboard/charts/weekly-attendance-chart";
import { PeakHoursChart } from "@/components/dashboard/charts/peak-hours-chart";
import { ReportsOverviewTab } from "@/components/dashboard/reports/overview-tab";
import { ReportActions, PrintReportHeader } from "@/components/dashboard/reports/report-actions";
import { Wallet, Users, UserMinus, TrendingUp } from "lucide-react";

import { members } from "@/lib/data/members";
import { revenueByMonth, revenueByCategory, revenueByPlan } from "@/lib/data/payments";
import { memberGrowth, retentionByCohort, churnReasons, classPerformance, trainerPerformance } from "@/lib/data/reports";
import { trainers } from "@/lib/data/trainers";
import { gymClasses } from "@/lib/data/classes";
import { classBookings } from "@/lib/data/class-bookings";
import { weeklyAttendance, peakHours } from "@/lib/data/attendance";
import { formatCurrency } from "@/lib/utils-data";
import { percentTrend, getClassUtilization, LOW_UTILIZATION_THRESHOLD, HIGH_UTILIZATION_THRESHOLD } from "@/lib/reports-helpers";
import type { CsvSection } from "@/lib/export-helpers";

type TabValue = "overview" | "revenue" | "members" | "attendance" | "classes" | "trainers" | "retention";

export function ReportsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "overview";
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  const monthlyRevenue = revenueByMonth[revenueByMonth.length - 1].revenue;
  const prevMonthlyRevenue = revenueByMonth[revenueByMonth.length - 2].revenue;
  const activeMembers = members.filter((m) => m.status === "active").length;
  const totalChurned = memberGrowth.reduce((s, m) => s + m.churned, 0);
  const avgRetention = Math.round(
    retentionByCohort.reduce((s, c) => s + c.month3, 0) / retentionByCohort.length
  );

  const thisMonthGrowth = memberGrowth[memberGrowth.length - 1];
  const lastMonthGrowth = memberGrowth[memberGrowth.length - 2];

  const utilization = getClassUtilization(gymClasses);
  const lowUtilClasses = utilization.filter((c) => c.utilization < LOW_UTILIZATION_THRESHOLD);
  const highUtilClasses = utilization.filter((c) => c.utilization >= HIGH_UTILIZATION_THRESHOLD);
  const totalBookingAttempts = classBookings.length;
  const cancelledOrNoShow = classBookings.filter((b) => b.status === "cancelled" || b.status === "no-show").length;
  const cancellationRate = totalBookingAttempts > 0 ? Math.round((cancelledOrNoShow / totalBookingAttempts) * 100) : 0;

  const sixMonthScope = `Last 6 months (${revenueByMonth[0].month}–${revenueByMonth[revenueByMonth.length - 1].month} 2026)`;

  const revenueSections: CsvSection[] = [
    {
      title: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Monthly Revenue", formatCurrency(monthlyRevenue)],
        ["Avg Revenue / Member", formatCurrency(Math.round(monthlyRevenue / activeMembers))],
        ["Top Plan", `${revenueByPlan[0].plan} (${revenueByPlan[0].value}% of revenue)`],
      ],
    },
    { title: "Revenue trend", headers: ["Month", "Revenue (£)"], rows: revenueByMonth.map((m) => [m.month, m.revenue]) },
    { title: "Revenue by category", headers: ["Category", "Amount (£)", "Share %"], rows: revenueByCategory.map((c) => [c.category, c.amount, c.share]) },
    { title: "Revenue by plan", headers: ["Plan", "Amount (£)", "Share %"], rows: revenueByPlan.map((p) => [p.plan, p.amount, p.value]) },
  ];

  const membershipStatusCounts = [
    { status: "Active", count: members.filter((m) => m.status === "active").length },
    { status: "Expiring", count: members.filter((m) => m.status === "expiring").length },
    { status: "Expired", count: members.filter((m) => m.status === "expired").length },
    { status: "Frozen", count: members.filter((m) => m.status === "frozen").length },
    { status: "Cancelled", count: members.filter((m) => m.status === "cancelled").length },
  ];
  const membersSections: CsvSection[] = [
    {
      title: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Active Members", activeMembers],
        ["New This Month", thisMonthGrowth.newMembers],
        ["Churned This Month", thisMonthGrowth.churned],
      ],
    },
    { title: "Member growth trend", headers: ["Month", "New Members", "Churned"], rows: memberGrowth.map((m) => [m.month, m.newMembers, m.churned]) },
    { title: "Membership status breakdown", headers: ["Status", "Count"], rows: membershipStatusCounts.map((s) => [s.status, s.count]) },
  ];

  const attendanceSections: CsvSection[] = [
    { title: "Weekly attendance pattern", headers: ["Day", "Visits"], rows: weeklyAttendance.map((d) => [d.day, d.visits]) },
    { title: "Peak hours", headers: ["Hour", "Visits"], rows: peakHours.map((h) => [h.hour, h.visits]) },
  ];

  const classesSections: CsvSection[] = [
    {
      title: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        [`Classes running under ${LOW_UTILIZATION_THRESHOLD}% capacity`, lowUtilClasses.length],
        [`Classes at or near ${HIGH_UTILIZATION_THRESHOLD}%+ capacity`, highUtilClasses.length],
        ["Cancellation / no-show rate", `${cancellationRate}%`],
      ],
    },
    {
      title: "Class performance",
      headers: ["Class", "Type", "Rating", "Sessions this month", "Avg attendance %"],
      rows: classPerformance.map((c) => [c.className, c.type, c.rating, c.sessionsThisMonth, c.avgAttendance]),
    },
    {
      title: "Live schedule utilization",
      headers: ["Class", "Day", "Time", "Trainer", "Booked", "Capacity", "Utilization %"],
      rows: utilization.map((u) => [
        u.gymClass.name,
        u.gymClass.day,
        u.gymClass.startTime,
        trainers.find((t) => t.id === u.gymClass.trainerId)?.name ?? "Unassigned",
        u.gymClass.booked,
        u.gymClass.capacity,
        u.utilization,
      ]),
    },
  ];

  const trainersSections: CsvSection[] = [
    {
      title: "Trainer performance",
      headers: ["Trainer", "Sessions/mo", "Rating", "Utilization %", "Revenue (£)"],
      rows: trainerPerformance.map((p) => [
        trainers.find((t) => t.id === p.trainerId)?.name ?? p.trainerId,
        p.sessionsRun,
        p.avgRating,
        p.utilization,
        p.revenue,
      ]),
    },
  ];

  const retentionSections: CsvSection[] = [
    {
      title: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["3-Month Retention", `${avgRetention}%`],
        ["Members Churned", totalChurned],
      ],
    },
    { title: "Retention by signup cohort", headers: ["Cohort", "Month 1 %", "Month 2 %", "Month 3 %"], rows: retentionByCohort.map((c) => [c.cohort, c.month1, c.month2, c.month3]) },
    { title: "Why members leave", headers: ["Reason", "Count"], rows: churnReasons.map((r) => [r.reason, r.count]) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader className="no-print" title="Reports & Analytics" description="Data behind every decision — nothing here for decoration" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="no-print">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="trainers">Trainer Performance</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ReportsOverviewTab />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <PrintReportHeader reportLabel="Revenue Report" scopeLabel={sixMonthScope} />
          <div className="flex justify-end">
            <ReportActions reportLabel="Revenue Report" scopeLabel={sixMonthScope} sections={revenueSections} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Monthly Revenue"
              value={formatCurrency(monthlyRevenue)}
              icon={Wallet}
              trend={percentTrend(monthlyRevenue, prevMonthlyRevenue)}
              helpText="vs last month"
            />
            <StatCard label="Avg Revenue / Member" value={formatCurrency(Math.round(monthlyRevenue / activeMembers))} icon={TrendingUp} helpText="this month" />
            <StatCard label="Top Plan" value={revenueByPlan[0].plan} icon={Users} helpText={`${revenueByPlan[0].value}% of revenue`} />
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Revenue trend</CardTitle>
                <CardDescription>Last 6 months — answers: is revenue growing?</CardDescription>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" asChild className="no-print">
                  <Link href="/owner/payments?tab=transactions">
                    View transactions
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent><RevenueChart /></CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Revenue by category</CardTitle><CardDescription>Where the money comes from</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {revenueByCategory.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{cat.category}</span><span className="font-medium tabular text-foreground">{formatCurrency(cat.amount)}</span></div>
                    <Progress value={cat.share} className="mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Revenue by plan</CardTitle><CardDescription>Which plans drive revenue</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {revenueByPlan.map((p) => (
                  <div key={p.plan}>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{p.plan}</span><span className="font-medium tabular text-foreground">{formatCurrency(p.amount)}</span></div>
                    <Progress value={p.value} className="mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <PrintReportHeader reportLabel="Members Report" scopeLabel={sixMonthScope} />
          <div className="flex justify-end">
            <ReportActions reportLabel="Members Report" scopeLabel={sixMonthScope} sections={membersSections} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Active Members" value={activeMembers.toString()} icon={Users} />
            <StatCard
              label="New This Month"
              value={thisMonthGrowth.newMembers.toString()}
              icon={TrendingUp}
              trend={percentTrend(thisMonthGrowth.newMembers, lastMonthGrowth.newMembers)}
              helpText="vs last month"
            />
            <StatCard
              label="Churned This Month"
              value={thisMonthGrowth.churned.toString()}
              icon={UserMinus}
              trend={percentTrend(thisMonthGrowth.churned, lastMonthGrowth.churned, { invert: true })}
              helpText="vs last month"
            />
          </div>
          <Card>
            <CardHeader><CardTitle>New vs. churned members</CardTitle><CardDescription>Answers: are we growing faster than we&apos;re losing members?</CardDescription></CardHeader>
            <CardContent><MemberGrowthChart /></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Membership status breakdown</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" asChild className="no-print">
                  <Link href="/owner/members">
                    View members
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <MembershipDistributionChart
                data={[
                  { label: "Active", value: members.filter((m) => m.status === "active").length, color: "active" },
                  { label: "Expiring", value: members.filter((m) => m.status === "expiring").length, color: "expiring" },
                  { label: "Expired", value: members.filter((m) => m.status === "expired").length, color: "expired" },
                  { label: "Frozen", value: members.filter((m) => m.status === "frozen").length, color: "frozen" },
                  { label: "Cancelled", value: members.filter((m) => m.status === "cancelled").length, color: "cancelled" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <PrintReportHeader reportLabel="Attendance Report" scopeLabel="Weekly pattern & peak hours (rolling average)" />
          <div className="flex justify-end">
            <ReportActions reportLabel="Attendance Report" scopeLabel="Weekly pattern & peak hours (rolling average)" sections={attendanceSections} />
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Weekly attendance</CardTitle>
                <CardDescription>Answers: which days need more staff on the floor?</CardDescription>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" asChild className="no-print">
                  <Link href="/owner/attendance?tab=history">
                    View log
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent><WeeklyAttendanceChart /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Peak hours</CardTitle><CardDescription>Answers: when should we schedule more classes?</CardDescription></CardHeader>
            <CardContent><PeakHoursChart /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <PrintReportHeader reportLabel="Classes Report" scopeLabel="Current schedule snapshot" />
          <div className="flex justify-end">
            <ReportActions reportLabel="Classes Report" scopeLabel="Current schedule snapshot" sections={classesSections} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Classes Running Low" value={lowUtilClasses.length.toString()} icon={AlertTriangle} helpText={`under ${LOW_UTILIZATION_THRESHOLD}% capacity`} />
            <StatCard label="Classes Near Capacity" value={highUtilClasses.length.toString()} icon={Users} helpText={`${HIGH_UTILIZATION_THRESHOLD}%+ capacity`} />
            <StatCard label="Cancellation / No-show Rate" value={`${cancellationRate}%`} icon={UserMinus} helpText="of all class bookings" />
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Class performance</CardTitle>
                <CardDescription>Answers: which classes are worth keeping — and which aren&apos;t?</CardDescription>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" asChild className="no-print">
                  <Link href="/owner/classes?tab=classes">
                    View schedule
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {classPerformance.map((c) => (
                <div key={c.className}>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-foreground">{c.className}</span>
                      <Badge variant="outline" className="ml-2">{c.type}</Badge>
                      {c.avgAttendance < LOW_UTILIZATION_THRESHOLD && (
                        <Badge variant="warning" className="ml-2">Low turnout</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="size-3.5 fill-brand-lime text-brand-lime" />{c.rating}</span>
                      <span className="tabular">{c.avgAttendance}% full</span>
                    </div>
                  </div>
                  <Progress value={c.avgAttendance} className="mt-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trainers" className="space-y-4">
          <PrintReportHeader reportLabel="Trainer Performance Report" scopeLabel="This month" />
          <div className="flex justify-end">
            <ReportActions reportLabel="Trainer Performance Report" scopeLabel="This month" sections={trainersSections} />
          </div>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Trainer</th>
                    <th className="px-4 py-3 font-medium">Sessions/mo</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Utilization</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {trainerPerformance.map((perf) => {
                    const trainer = trainers.find((t) => t.id === perf.trainerId);
                    return (
                      <tr key={perf.trainerId} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8"><AvatarFallback className="text-xs">{trainer?.initials}</AvatarFallback></Avatar>
                            <span className="font-medium text-foreground">{trainer?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular text-muted-foreground">{perf.sessionsRun}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 tabular text-muted-foreground">
                            <Star className="size-3.5 fill-brand-lime text-brand-lime" />{perf.avgRating}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={perf.utilization} className="w-24" />
                            <span className="tabular text-xs text-muted-foreground">{perf.utilization}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular text-foreground">{formatCurrency(perf.revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Button variant="ghost" size="sm" asChild className="no-print">
            <Link href="/owner/staff">
              View team
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <PrintReportHeader reportLabel="Retention Report" scopeLabel={sixMonthScope} />
          <div className="flex justify-end">
            <ReportActions reportLabel="Retention Report" scopeLabel={sixMonthScope} sections={retentionSections} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="3-Month Retention" value={`${avgRetention}%`} icon={Users} helpText="average across cohorts" />
            <StatCard label="Members Churned" value={totalChurned.toString()} icon={UserMinus} helpText="last 6 months" />
          </div>
          <Card>
            <CardHeader><CardTitle>Retention by signup cohort</CardTitle><CardDescription>Answers: are newer members sticking around better than older ones?</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 font-medium">Cohort</th>
                    <th className="py-2 font-medium">Month 1</th>
                    <th className="py-2 font-medium">Month 2</th>
                    <th className="py-2 font-medium">Month 3</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionByCohort.map((c) => (
                    <tr key={c.cohort} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium text-foreground">{c.cohort}</td>
                      <td className="py-2.5 tabular text-muted-foreground">{c.month1}%</td>
                      <td className="py-2.5 tabular text-muted-foreground">{c.month2}%</td>
                      <td className="py-2.5 tabular text-foreground">{c.month3}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Why members leave</CardTitle>
                <CardDescription>Answers: what should we fix to reduce churn?</CardDescription>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" asChild className="no-print">
                  <Link href="/owner/members?tab=expired">
                    View expired members
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {churnReasons.map((r) => (
                <div key={r.reason}>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">{r.reason}</span><span className="font-medium tabular text-foreground">{r.count}</span></div>
                  <Progress value={(r.count / Math.max(...churnReasons.map((x) => x.count))) * 100} className="mt-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
