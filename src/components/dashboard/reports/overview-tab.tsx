"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  UserPlus,
  UserMinus,
  RefreshCcw,
  Activity,
  Sparkles,
  ArrowRight,
  CalendarClock,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { TrendBarChart } from "@/components/dashboard/charts/trend-bar-chart";
import { NeedsAttention } from "@/components/dashboard/needs-attention";

import { members } from "@/lib/data/members";
import { payments } from "@/lib/data/payments";
import { attendanceRecords } from "@/lib/data/attendance";
import { leads } from "@/lib/data/leads";
import { gymClasses } from "@/lib/data/classes";
import { formatCurrency } from "@/lib/utils-data";
import {
  TODAY,
  buildPeriod,
  percentTrend,
  isBeyondDataCoverage,
  getRevenueInRange,
  getDailyRevenueInRange,
  getRenewalsInRange,
  getNewMembersInRange,
  getChurnedInRange,
  getExpiringSoon,
  getInactiveMembers,
  getAttendanceInRange,
  getUniqueVisitorsInRange,
  getDailyAttendanceInRange,
  getLeadsCreatedInRange,
  getConversionsInRange,
  getClassUtilization,
  LOW_UTILIZATION_THRESHOLD,
  HIGH_UTILIZATION_THRESHOLD,
} from "@/lib/reports-helpers";
import type { PeriodPreset, DateRange } from "@/lib/reports-helpers";
import type { AlertItem } from "@/lib/data/types";

const LEAD_SOURCES = ["Website", "Instagram", "Referral", "Walk-in", "Advertisement"] as const;

function KpiLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group block">
      <div className="transition-colors group-hover:[&>div]:border-primary/40">{children}</div>
    </Link>
  );
}

export function ReportsOverviewTab() {
  const [preset, setPreset] = React.useState<PeriodPreset>("month");
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(undefined);
  const [loading, setLoading] = React.useState(false);
  const loadingTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handlePeriodChange(nextPreset: PeriodPreset, next?: DateRange) {
    setPreset(nextPreset);
    if (nextPreset === "custom") setCustomRange(next);
    setLoading(true);
    if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    loadingTimeout.current = setTimeout(() => setLoading(false), 450);
  }

  React.useEffect(() => {
    return () => {
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    };
  }, []);

  const period = buildPeriod(preset, customRange);
  const { range, comparisonRange } = period;
  const outOfCoverage = isBeyondDataCoverage(range);

  const revenue = getRevenueInRange(payments, range);
  const prevRevenue = getRevenueInRange(payments, comparisonRange);

  const newMembers = getNewMembersInRange(members, range);
  const prevNewMembers = getNewMembersInRange(members, comparisonRange);

  const churned = getChurnedInRange(members, range);
  const prevChurned = getChurnedInRange(members, comparisonRange);

  const renewals = getRenewalsInRange(payments, members, range);
  const prevRenewals = getRenewalsInRange(payments, members, comparisonRange);
  const renewalRevenue = renewals.reduce((sum, p) => sum + p.amount, 0);

  const visits = getAttendanceInRange(attendanceRecords, range);
  const prevVisits = getAttendanceInRange(attendanceRecords, comparisonRange);
  const uniqueVisitors = getUniqueVisitorsInRange(attendanceRecords, range);

  const newLeads = getLeadsCreatedInRange(leads, range);
  const conversions = getConversionsInRange(leads, range);
  const prevConversions = getConversionsInRange(leads, comparisonRange);
  const conversionRate = newLeads.length > 0 ? Math.round((conversions.length / newLeads.length) * 100) : null;

  const dailyRevenue = getDailyRevenueInRange(payments, range);
  const dailyVisits = getDailyAttendanceInRange(attendanceRecords, range);
  const canChartTrend = dailyRevenue.length >= 3;

  const leadsBySource = LEAD_SOURCES.map((source) => ({
    source,
    count: newLeads.filter((l) => l.source === source).length,
  })).filter((s) => s.count > 0);

  // Operational insights — current state, not period-filtered (mirrors the Owner Dashboard's convention).
  const expiringSoon = getExpiringSoon(members);
  const inactiveMembers = getInactiveMembers(members);
  const utilization = getClassUtilization(gymClasses);
  const lowUtilClasses = utilization.filter((c) => c.utilization < LOW_UTILIZATION_THRESHOLD);
  const highUtilClasses = utilization.filter((c) => c.utilization >= HIGH_UTILIZATION_THRESHOLD);
  const leadsNeedingFollowUp = leads.filter(
    (l) => l.nextFollowUp && l.nextFollowUp <= TODAY && l.status !== "converted" && l.status !== "lost"
  );
  const failedPayments = payments.filter((p) => p.status === "failed");

  const rawInsights: AlertItem[] = [
    { id: "i1", severity: "high", message: `${expiringSoon.length} memberships expire within 7 days`, href: "/owner/memberships?tab=expiring" },
    { id: "i2", severity: "high", message: `${failedPayments.length} failed payments need follow-up`, href: "/owner/payments?tab=pending" },
    { id: "i3", severity: "medium", message: `${inactiveMembers.length} members haven't checked in for 14+ days`, href: "/owner/attendance?tab=insights" },
    { id: "i4", severity: "medium", message: `${lowUtilClasses.length} classes are running under ${LOW_UTILIZATION_THRESHOLD}% capacity`, href: "/owner/classes?tab=classes" },
    { id: "i5", severity: "low", message: `${highUtilClasses.length} classes are at or near capacity — consider adding a session`, href: "/owner/classes?tab=calendar" },
    { id: "i6", severity: "medium", message: `${leadsNeedingFollowUp.length} leads are overdue for follow-up`, href: "/owner/leads?tab=followups" },
  ];
  const insights = rawInsights.filter((a) => !a.message.startsWith("0"));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-full max-w-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[122px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{period.label}</p>
          <p className="text-xs text-muted-foreground">{period.comparisonLabel}</p>
        </div>
        <PeriodFilter preset={preset} customRange={customRange} maxDate={TODAY} onChange={handlePeriodChange} />
      </div>

      {outOfCoverage ? (
        <EmptyState
          icon={CalendarClock}
          title="Historical data isn't available for this range"
          description="Detailed transaction and check-in records go back to early August 2026. Choose a more recent range to see real numbers."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiLink href="/owner/payments?tab=transactions">
              <StatCard
                label="Revenue"
                value={formatCurrency(revenue)}
                icon={Wallet}
                trend={percentTrend(revenue, prevRevenue)}
                helpText={period.comparisonLabel}
              />
            </KpiLink>
            <KpiLink href="/owner/members">
              <StatCard
                label="New Members"
                value={newMembers.length.toString()}
                icon={UserPlus}
                trend={percentTrend(newMembers.length, prevNewMembers.length)}
                helpText={period.comparisonLabel}
              />
            </KpiLink>
            <KpiLink href="/owner/payments?tab=membership">
              <StatCard
                label="Renewals"
                value={renewals.length.toString()}
                icon={RefreshCcw}
                trend={percentTrend(renewals.length, prevRenewals.length)}
                helpText={`${formatCurrency(renewalRevenue)} collected`}
              />
            </KpiLink>
            <KpiLink href="/owner/members?tab=expired">
              <StatCard
                label="Churned"
                value={churned.length.toString()}
                icon={UserMinus}
                trend={percentTrend(churned.length, prevChurned.length, { invert: true })}
                helpText={period.comparisonLabel}
              />
            </KpiLink>
            <KpiLink href="/owner/attendance?tab=history">
              <StatCard
                label="Visits"
                value={visits.length.toString()}
                icon={Activity}
                trend={percentTrend(visits.length, prevVisits.length)}
                helpText={`${uniqueVisitors} unique members`}
              />
            </KpiLink>
            <KpiLink href="/owner/leads?tab=converted">
              <StatCard
                label="Leads Converted"
                value={conversions.length.toString()}
                icon={Sparkles}
                trend={percentTrend(conversions.length, prevConversions.length)}
                helpText={conversionRate !== null ? `${conversionRate}% of ${newLeads.length} new leads` : `${newLeads.length} new leads`}
              />
            </KpiLink>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue in period</CardTitle>
                <CardDescription>Answers: is revenue growing within {period.label.toLowerCase()}?</CardDescription>
              </CardHeader>
              <CardContent>
                {revenue === 0 ? (
                  <EmptyState icon={Wallet} title="No revenue in this period" description="No paid transactions landed in this date range. Try a wider range." />
                ) : !canChartTrend ? (
                  <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                    <p className="font-display text-2xl font-bold tabular text-foreground">{formatCurrency(revenue)}</p>
                    <p className="text-xs text-muted-foreground">Pick a range of 3+ days to see a daily trend line.</p>
                  </div>
                ) : (
                  <RevenueChart data={dailyRevenue} xKey="label" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visits in period</CardTitle>
                <CardDescription>Answers: is attendance trending up or down?</CardDescription>
              </CardHeader>
              <CardContent>
                {visits.length === 0 ? (
                  <EmptyState icon={Activity} title="No check-ins in this period" description="No members checked in during this date range." />
                ) : !canChartTrend ? (
                  <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                    <p className="font-display text-2xl font-bold tabular text-foreground">{visits.length} visits</p>
                    <p className="text-xs text-muted-foreground">Pick a range of 3+ days to see a daily trend line.</p>
                  </div>
                ) : (
                  <TrendBarChart data={dailyVisits} xKey="label" yKey="visits" valueLabel="Visits" color="var(--color-info)" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <NeedsAttention alerts={insights} />

            <Card>
              <CardHeader>
                <CardTitle>Leads &amp; conversion</CardTitle>
                <CardDescription>{period.label} · where new enquiries came from</CardDescription>
              </CardHeader>
              <CardContent>
                {newLeads.length === 0 ? (
                  <EmptyState icon={Users} title="No new leads in this period" description="No enquiries came in during this date range." />
                ) : (
                  <div className="space-y-3">
                    {leadsBySource
                      .sort((a, b) => b.count - a.count)
                      .map((s) => (
                        <div key={s.source}>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{s.source}</span>
                            <span className="font-medium tabular text-foreground">{s.count}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                              style={{ width: `${(s.count / newLeads.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
                  <Link href="/owner/leads">
                    View leads &amp; enquiries
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
