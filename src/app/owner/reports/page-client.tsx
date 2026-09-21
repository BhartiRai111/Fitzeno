"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { MembershipDistributionChart } from "@/components/dashboard/charts/membership-distribution-chart";
import { MemberGrowthChart } from "@/components/dashboard/charts/member-growth-chart";
import { WeeklyAttendanceChart } from "@/components/dashboard/charts/weekly-attendance-chart";
import { PeakHoursChart } from "@/components/dashboard/charts/peak-hours-chart";
import { Wallet, Users, UserMinus, TrendingUp } from "lucide-react";

import { members } from "@/lib/data/members";
import { revenueByMonth, revenueByCategory, revenueByPlan } from "@/lib/data/payments";
import { memberGrowth, retentionByCohort, churnReasons, classPerformance, trainerPerformance } from "@/lib/data/reports";
import { trainers } from "@/lib/data/trainers";
import { formatCurrency } from "@/lib/utils-data";

type TabValue = "revenue" | "members" | "attendance" | "classes" | "trainers" | "retention";

export function ReportsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "revenue";
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  const monthlyRevenue = revenueByMonth[revenueByMonth.length - 1].revenue;
  const activeMembers = members.filter((m) => m.status === "active").length;
  const totalChurned = memberGrowth.reduce((s, m) => s + m.churned, 0);
  const totalNew = memberGrowth.reduce((s, m) => s + m.newMembers, 0);
  const avgRetention = Math.round(
    retentionByCohort.reduce((s, c) => s + c.month3, 0) / retentionByCohort.length
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Data behind every decision — nothing here for decoration" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="trainers">Trainer Performance</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Monthly Revenue" value={formatCurrency(monthlyRevenue)} icon={Wallet} trend={{ value: "+5.1%", direction: "up" }} helpText="vs last month" />
            <StatCard label="Avg Revenue / Member" value={formatCurrency(Math.round(monthlyRevenue / activeMembers))} icon={TrendingUp} helpText="this month" />
            <StatCard label="Top Plan" value={revenueByPlan[0].plan} icon={Users} helpText={`${revenueByPlan[0].value}% of revenue`} />
          </div>
          <Card>
            <CardHeader><CardTitle>Revenue trend</CardTitle><CardDescription>Last 6 months — answers: is revenue growing?</CardDescription></CardHeader>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Active Members" value={activeMembers.toString()} icon={Users} />
            <StatCard label="New This Period" value={totalNew.toString()} icon={TrendingUp} helpText="last 6 months" />
            <StatCard label="Churned" value={totalChurned.toString()} icon={UserMinus} helpText="last 6 months" />
          </div>
          <Card>
            <CardHeader><CardTitle>New vs. churned members</CardTitle><CardDescription>Answers: are we growing faster than we&apos;re losing members?</CardDescription></CardHeader>
            <CardContent><MemberGrowthChart /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Membership status breakdown</CardTitle></CardHeader>
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
          <Card>
            <CardHeader><CardTitle>Weekly attendance</CardTitle><CardDescription>Answers: which days need more staff on the floor?</CardDescription></CardHeader>
            <CardContent><WeeklyAttendanceChart /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Peak hours</CardTitle><CardDescription>Answers: when should we schedule more classes?</CardDescription></CardHeader>
            <CardContent><PeakHoursChart /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Class performance</CardTitle><CardDescription>Answers: which classes are worth keeping — and which aren&apos;t?</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {classPerformance.map((c) => (
                <div key={c.className}>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-foreground">{c.className}</span>
                      <Badge variant="outline" className="ml-2">{c.type}</Badge>
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
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
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
            <CardHeader><CardTitle>Why members leave</CardTitle><CardDescription>Answers: what should we fix to reduce churn?</CardDescription></CardHeader>
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
