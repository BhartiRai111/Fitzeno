"use client";

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
  ShoppingBag,
  PiggyBank,
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
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck2 } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { useMembersRoster } from "@/hooks/use-members";
import { useLeadsRoster } from "@/hooks/use-leads";
import { useTransactionsRoster, useTransactionStats, useTransactionCount } from "@/hooks/use-transactions";
import { gymClasses } from "@/lib/data/classes";
import { attendanceRecords, weeklyAttendance } from "@/lib/data/attendance";
import { classBookings } from "@/lib/data/class-bookings";
import { products } from "@/lib/data/products";
import { getLowStockProducts } from "@/lib/store-helpers";
import { expenses } from "@/lib/data/expenses";
import { getPendingExpenses } from "@/lib/finance-helpers";
import { recentActivity } from "@/lib/data/activity";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import { percentTrend } from "@/lib/reports-helpers";
import type { AlertItem } from "@/lib/data/types";

const MOCK_TODAY = "2026-09-21";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function OwnerOverviewPage() {
  const { user, tenant } = useAuth();
  const { members, isLoading: membersLoading } = useMembersRoster();
  const { leads, isLoading: leadsLoading } = useLeadsRoster();
  const { payments: recentTx } = useTransactionsRoster();

  const now = new Date();
  const todayIso = isoDate(now);
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const prevMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevMonthEnd = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));

  const todayStats = useTransactionStats(todayIso, todayIso);
  const monthStats = useTransactionStats(monthStart, todayIso);
  const prevMonthStats = useTransactionStats(prevMonthStart, prevMonthEnd);
  const pendingCount = useTransactionCount({ status: "PENDING" });
  const failedCount = useTransactionCount({ status: "FAILED" });

  if (membersLoading || leadsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === "active");
  const expiringMembers = members.filter((m) => m.status === "expiring");
  const expiredMembers = members.filter((m) => m.status === "expired");
  const frozenMembers = members.filter((m) => m.status === "frozen");
  const cancelledMembers = members.filter((m) => m.status === "cancelled");
  const currentYearMonth = isoDate(now).slice(0, 7);
  const newMembersThisMonth = members.filter((m) => m.joinedOn.startsWith(currentYearMonth));

  const todaysRevenue = todayStats.data?.totalRevenue ?? 0;
  const monthlyRevenue = monthStats.data?.totalRevenue ?? 0;
  const prevMonthlyRevenue = prevMonthStats.data?.totalRevenue ?? 0;

  const todaysAttendance = attendanceRecords.filter((a) => a.date === MOCK_TODAY);
  const weeklyAvg = Math.round(weeklyAttendance.reduce((sum, d) => sum + d.visits, 0) / weeklyAttendance.length);
  const monthlyAttendance = weeklyAttendance.reduce((sum, d) => sum + d.visits, 0) * 4;

  const recentPayments = [...recentTx].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  const followUpsToday = leads.filter((l) => l.nextFollowUp === todayIso);
  const convertedLeads = leads.filter((l) => l.status === "converted");
  const conversionRate = leads.length > 0 ? ((convertedLeads.length / leads.length) * 100).toFixed(0) : "0";

  const todaysClasses = gymClasses.filter((c) => c.day === "Mon");
  const classesWithWaitlist = new Set(
    classBookings.filter((b) => b.status === "waitlisted").map((b) => b.classId)
  );

  const leadsNeedingFollowUp = leads.filter(
    (l) => l.nextFollowUp && l.nextFollowUp <= todayIso && l.status !== "converted" && l.status !== "lost"
  );
  const lowStockProducts = getLowStockProducts(products);
  const pendingExpenses = getPendingExpenses(expenses);

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
      message: `${pendingCount} pending payments`,
      href: "/owner/payments?tab=pending",
    },
    {
      id: "a3",
      severity: "high",
      message: `${failedCount} failed payments`,
      href: "/owner/payments?tab=pending",
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
    {
      id: "a7",
      severity: "medium",
      message: `${lowStockProducts.length} store products need restocking`,
      href: "/owner/store?tab=inventory",
    },
    {
      id: "a8",
      severity: "low",
      message: `${pendingExpenses.length} expenses awaiting payment`,
      href: "/owner/finances?tab=expenses&status=pending",
    },
  ];
  const alerts = rawAlerts.filter((a) => !a.message.startsWith("0"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning${user ? `, ${user.firstName}` : ""}`}
        description={`Here's how ${tenant?.name ?? "your gym"} is doing today, ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}.`}
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
              <DropdownMenuItem asChild>
                <Link href="/owner/store?tab=pos">
                  <ShoppingBag />
                  New Sale
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/owner/finances?tab=expenses">
                  <PiggyBank />
                  Record Expense
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
          helpText={members.length > 0 ? `${Math.round((activeMembers.length / members.length) * 100)}% of all members` : "no members yet"}
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
          helpText={`${todayStats.data?.paidCount ?? 0} transactions`}
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
            <ExpiringMembersList members={expiringMembers} today={todayIso} />
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
            <CardDescription>{formatDate(todayIso)}</CardDescription>
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
                    <Button size="sm" variant="ghost" className="shrink-0" asChild>
                      <Link href={`/owner/leads?leadId=${lead.id}`}>Follow up</Link>
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
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Check-in tracking isn&apos;t connected yet — attendance figures above are illustrative.
            </p>
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
            <AtRiskMembers members={members} today={todayIso} />
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
