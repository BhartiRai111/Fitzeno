import Link from "next/link";
import {
  Wallet,
  Users,
  UserPlus,
  QrCode,
  ArrowRight,
  CalendarClock,
  TrendingUp,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RevenueAnalyticsCard } from "@/components/dashboard/revenue-analytics-card";
import { MembershipDistributionChart } from "@/components/dashboard/charts/membership-distribution-chart";
import { PeakHoursChart } from "@/components/dashboard/charts/peak-hours-chart";
import { ExpiringMembersList } from "@/components/dashboard/expiring-members-list";
import { AtRiskMembers } from "@/components/dashboard/at-risk-members";
import { LeadFunnel } from "@/components/dashboard/lead-funnel";
import { TodaysClasses } from "@/components/dashboard/todays-classes";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarCheck2 } from "lucide-react";

import { members } from "@/lib/data/members";
import { leads } from "@/lib/data/leads";
import { payments, revenueByMonth } from "@/lib/data/payments";
import { gymClasses } from "@/lib/data/classes";
import { attendanceRecords, weeklyAttendance } from "@/lib/data/attendance";
import { classBookings } from "@/lib/data/class-bookings";
import { recentActivity } from "@/lib/data/activity";
import { formatCurrency, formatDate, daysBetween } from "@/lib/utils-data";
import { percentTrend } from "@/lib/reports-helpers";
import type { AlertItem } from "@/lib/data/types";

const TODAY = "2026-09-21";

export default function OwnerOverviewPage() {
  const activeMembers = members.filter((m) => m.status === "active");
  const expiringMembers = members.filter((m) => m.status === "expiring");
  const expiredMembers = members.filter((m) => m.status === "expired");
  const frozenMembers = members.filter((m) => m.status === "frozen");
  const cancelledMembers = members.filter((m) => m.status === "cancelled");
  const newMembersThisMonth = members.filter((m) => m.joinedOn.startsWith("2026-09"));

  const todaysRevenue = payments
    .filter((p) => p.date === TODAY && p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const monthlyRevenue = revenueByMonth[revenueByMonth.length - 1].revenue;
  const prevMonthlyRevenue = revenueByMonth[revenueByMonth.length - 2].revenue;

  const todaysAttendance = attendanceRecords.filter((a) => a.date === TODAY);
  const weeklyAvg = Math.round(weeklyAttendance.reduce((sum, d) => sum + d.visits, 0) / weeklyAttendance.length);
  const monthlyAttendance = weeklyAttendance.reduce((sum, d) => sum + d.visits, 0) * 4;
  const mostActive = [...members].sort((a, b) => b.attendanceThisMonth - a.attendanceThisMonth).slice(0, 5);

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const failedPayments = payments.filter((p) => p.status === "failed");
  const recentPayments = [...payments].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  const followUpsToday = leads.filter((l) => l.nextFollowUp === TODAY);
  const convertedLeads = leads.filter((l) => l.status === "converted");
  const conversionRate = ((convertedLeads.length / leads.length) * 100).toFixed(0);

  const todaysClasses = gymClasses.filter((c) => c.day === "Mon");
  const classesWithWaitlist = new Set(
    classBookings.filter((b) => b.status === "waitlisted").map((b) => b.classId)
  );

  const inactive14Plus = members.filter((m) => daysBetween(m.lastCheckIn, TODAY) >= 14);
  const leadsNeedingFollowUp = leads.filter(
    (l) => l.nextFollowUp && l.nextFollowUp <= TODAY && l.status !== "converted" && l.status !== "lost"
  );

  const rawAlerts: AlertItem[] = [
    {
      id: "a1",
      severity: "high",
      message: `${expiringMembers.length} memberships expire this week`,
      href: "/owner/memberships?tab=expiring",
    },
    {
      id: "a2",
      severity: "medium",
      message: `${pendingPayments.length} pending payments`,
      href: "/owner/payments?tab=pending",
    },
    {
      id: "a3",
      severity: "high",
      message: `${failedPayments.length} failed payments`,
      href: "/owner/payments?tab=pending",
    },
    {
      id: "a4",
      severity: "medium",
      message: `${inactive14Plus.length} members inactive for 14+ days`,
      href: "/owner/attendance?tab=insights",
    },
    {
      id: "a5",
      severity: "low",
      message: `${classesWithWaitlist.size} classes have waitlists`,
      href: "/owner/classes?tab=waitlist",
    },
    {
      id: "a6",
      severity: "medium",
      message: `${leadsNeedingFollowUp.length} leads require follow-up`,
      href: "/owner/leads?tab=all",
    },
  ];
  const alerts = rawAlerts.filter((a) => !a.message.startsWith("0"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning, Sam"
        description="Here's how Fitzeno — Riverside District is doing today, Monday 21 September."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Quick Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/owner/members">
                  <UserPlus />
                  Add Member
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/owner/leads">
                  <UserPlus />
                  Add Lead
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/owner/payments">
                  <Wallet />
                  Record Payment
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active Members"
          value={activeMembers.length.toString()}
          icon={Users}
          helpText={`${Math.round((activeMembers.length / members.length) * 100)}% of all members`}
        />
        <StatCard
          label="New Members"
          value={newMembersThisMonth.length.toString()}
          icon={UserPlus}
          helpText="this month"
        />
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(todaysRevenue)}
          icon={Wallet}
          helpText={`${payments.filter((p) => p.date === TODAY).length} transactions`}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          icon={TrendingUp}
          trend={percentTrend(monthlyRevenue, prevMonthlyRevenue)}
          helpText="vs last month"
        />
        <StatCard
          label="Today's Attendance"
          value={todaysAttendance.length.toString()}
          icon={QrCode}
          helpText="check-ins so far"
        />
        <StatCard
          label="Expiring Memberships"
          value={expiringMembers.length.toString()}
          icon={CalendarClock}
          helpText="within 7 days"
        />
      </div>

      {/* Revenue analytics */}
      <RevenueAnalyticsCard />

      {/* Membership overview + expiring */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Membership overview</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <MembershipDistributionChart
              data={[
                { label: "Active", value: activeMembers.length, color: "active" },
                { label: "Expiring", value: expiringMembers.length, color: "expiring" },
                { label: "Expired", value: expiredMembers.length, color: "expired" },
                { label: "Frozen", value: frozenMembers.length, color: "frozen" },
                { label: "Cancelled", value: cancelledMembers.length, color: "cancelled" },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Memberships expiring soon</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/owner/memberships?tab=expiring">
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ExpiringMembersList members={expiringMembers} today={TODAY} />
          </CardContent>
        </Card>
      </div>

      {/* Leads & conversion */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads &amp; conversion</CardTitle>
            <CardDescription>{conversionRate}% conversion rate this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
              {[
                { label: "New", value: leads.filter((l) => l.status === "new").length },
                { label: "Follow-ups due", value: leadsNeedingFollowUp.length },
                { label: "Trials booked", value: leads.filter((l) => l.status === "trial-booked").length },
                { label: "Trial completed", value: leads.filter((l) => l.status === "trial-attended").length },
                { label: "Converted", value: convertedLeads.length },
              ].map((stat) => (
                <div key={stat.label} className="rounded-md bg-muted/40 px-2 py-2.5">
                  <p className="font-display text-lg font-bold tabular text-foreground">{stat.value}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <LeadFunnel leads={leads} />
            <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
              <Link href="/owner/leads">
                View leads &amp; enquiries
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups today</CardTitle>
            <CardDescription>{formatDate(TODAY)}</CardDescription>
          </CardHeader>
          <CardContent>
            {followUpsToday.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title="No follow-ups due today"
                description="You're all caught up with lead follow-ups."
              />
            ) : (
              <div className="space-y-1">
                {followUpsToday.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-xs">{lead.initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.source} · {lead.interest}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      Follow up
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance overview</CardTitle>
            <CardDescription>Peak hours today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-muted/40 px-2 py-2.5">
                <p className="font-display text-lg font-bold tabular text-foreground">{todaysAttendance.length}</p>
                <p className="text-[11px] text-muted-foreground">Today</p>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-2.5">
                <p className="font-display text-lg font-bold tabular text-foreground">{weeklyAvg}</p>
                <p className="text-[11px] text-muted-foreground">Weekly avg</p>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-2.5">
                <p className="font-display text-lg font-bold tabular text-foreground">{monthlyAttendance.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">This month</p>
              </div>
            </div>
            <PeakHoursChart />
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Most active this month</p>
              <div className="flex flex-wrap gap-2">
                {mostActive.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5"
                  >
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[10px]">{member.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground">{member.attendanceThisMonth}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
              <Link href="/owner/attendance">
                View attendance
                <ArrowRight className="size-4" />
              </Link>
            </Button>
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

      {/* Today's classes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Today&apos;s classes</CardTitle>
            <CardDescription>Monday, September 21</CardDescription>
          </div>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/owner/classes">
                View full schedule
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <TodaysClasses classes={todaysClasses} />
        </CardContent>
      </Card>

      {/* Recent payments */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent payments</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/owner/payments">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 font-medium">Member</th>
                  <th className="py-2 font-medium">Plan</th>
                  <th className="py-2 font-medium">Amount</th>
                  <th className="py-2 font-medium">Method</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{payment.memberInitials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{payment.memberName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{payment.plan}</td>
                    <td className="py-2.5 tabular text-foreground">{formatCurrency(payment.amount)}</td>
                    <td className="py-2.5 text-muted-foreground">{payment.method}</td>
                    <td className="py-2.5 text-muted-foreground">{formatDate(payment.date)}</td>
                    <td className="py-2.5"><PaymentStatusBadge status={payment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <QuickActions />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NeedsAttention alerts={alerts} />
        <RecentActivity activity={recentActivity} />
      </div>
    </div>
  );
}
