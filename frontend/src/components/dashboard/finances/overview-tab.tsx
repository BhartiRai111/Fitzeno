"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  Receipt,
  Percent,
  Clock,
  RefreshCcw,
  ArrowRight,
  PiggyBank,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { ExpenseStatusBadge } from "@/components/shared/status-badge";
import { ReportActions, PrintReportHeader } from "@/components/dashboard/reports/report-actions";
import { ProfitTrendChart } from "@/components/dashboard/charts/profit-trend-chart";
import { useFinanceOverview, useFinanceTrend } from "@/hooks/use-finance";

import { formatCurrency, formatDate } from "@/lib/utils-data";
import { buildPeriod, percentTrend, formatRangeLabel } from "@/lib/reports-helpers";
import type { PeriodPreset, DateRange } from "@/lib/reports-helpers";
import type { CsvSection } from "@/lib/export-helpers";
import type { AlertItem } from "@/lib/data/types";

function trendText(t?: { value: string }): string {
  return t ? t.value : "—";
}

export function FinancesOverviewTab() {
  const [preset, setPreset] = React.useState<PeriodPreset>("month");
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(undefined);
  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  function handlePeriodChange(nextPreset: PeriodPreset, next?: DateRange) {
    setPreset(nextPreset);
    if (nextPreset === "custom") setCustomRange(next);
  }

  const period = buildPeriod(preset, customRange, todayIso);
  const { range } = period;

  const { data, isLoading } = useFinanceOverview(preset, customRange);
  const { points: trendPoints } = useFinanceTrend(6);

  const revenue = data?.netRevenue ?? 0;
  const prevRevenue = data?.previousNetRevenue ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const prevExpenses = data?.previousTotalExpenses ?? 0;
  const netProfit = data?.netResult ?? 0;
  const prevNetProfit = data?.previousNetResult ?? 0;
  const profitMargin = data?.profitMargin ?? 0;

  const recurringSplit = data?.recurringVsOneTime ?? { recurring: 0, oneTime: 0 };
  const categoryBreakdown = data?.expensesByCategory ?? [];
  const largestCategory = categoryBreakdown[0];
  const unusualIncreases = data?.unusualCategoryIncreases ?? [];

  const pendingInsights = data?.pendingExpenses;
  const pendingAmount = pendingInsights?.pendingAmount ?? 0;
  const pendingCount = pendingInsights?.pendingCount ?? 0;
  const recentExpenses = data?.recentExpenses ?? [];

  const rawAlerts: AlertItem[] = [
    { id: "f1", severity: "high", message: `${pendingInsights?.overdueCount ?? 0} pending expenses are overdue`, href: "/owner/finances?tab=expenses&status=pending" },
    { id: "f2", severity: "medium", message: `${pendingInsights?.dueSoonCount ?? 0} expenses due within 7 days — ${formatCurrency(pendingInsights?.dueSoonAmount ?? 0)}`, href: "/owner/finances?tab=expenses&status=pending" },
    ...unusualIncreases.slice(0, 3).map((c, i) => ({
      id: `f-unusual-${i}`,
      severity: "medium" as const,
      message: `${c.category} spending is up ${c.changePercent}% vs. ${period.comparisonLabel.replace("vs ", "")}`,
      href: `/owner/finances?tab=expenses&category=${encodeURIComponent(c.category)}`,
    })),
  ];
  const insights = rawAlerts.filter((a) => !a.message.startsWith("0"));

  const scopeLabel = `${period.label} · ${formatRangeLabel(range)}`;
  const csvSections: CsvSection[] = !data
    ? []
    : [
        {
          title: "Key metrics",
          headers: ["Metric", "This period", "Previous period", "Change"],
          rows: [
            ["Revenue", formatCurrency(revenue), formatCurrency(prevRevenue), trendText(percentTrend(revenue, prevRevenue))],
            ["Expenses", formatCurrency(totalExpenses), formatCurrency(prevExpenses), trendText(percentTrend(totalExpenses, prevExpenses, { invert: true }))],
            ["Net Profit", formatCurrency(netProfit), formatCurrency(prevNetProfit), trendText(percentTrend(netProfit, prevNetProfit))],
            ["Profit Margin", `${profitMargin}%`, "—", "—"],
          ],
        },
        ...(categoryBreakdown.length > 0
          ? [{ title: "Expenses by category", headers: ["Category", "Amount (£)", "Share %"], rows: categoryBreakdown.map((c) => [c.category, c.amount, c.share]) }]
          : []),
        {
          title: "Recurring vs one-time",
          headers: ["Type", "Amount (£)"],
          rows: [
            ["Recurring", recurringSplit.recurring],
            ["One-time", recurringSplit.oneTime],
          ],
        },
        ...(insights.length > 0
          ? [{ title: "Needs attention", headers: ["Priority", "Item"], rows: insights.map((i) => [i.severity, i.message]) }]
          : []),
      ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-full max-w-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[122px]" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrintReportHeader reportLabel="Financial Overview" scopeLabel={scopeLabel} />

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{period.label}</p>
          <p className="text-xs text-muted-foreground">{period.comparisonLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter preset={preset} customRange={customRange} maxDate={todayIso} onChange={handlePeriodChange} />
          <ReportActions
            reportLabel="Financial Overview"
            scopeLabel={scopeLabel}
            sections={csvSections}
            emptyReason="There's no financial activity in this period to export or print yet."
          />
        </div>
      </div>

      <div className="no-print flex items-start gap-2.5 rounded-md border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
        <PiggyBank className="mt-0.5 size-3.5 shrink-0" />
        <span>Sensitive financial data — visible to Owner and Manager roles only. Front desk and trainers don&apos;t see this page.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/owner/payments?tab=transactions" className="group block">
          <div className="transition-colors group-hover:[&>div]:border-primary/40">
            <StatCard label="Revenue" value={formatCurrency(revenue)} icon={Wallet} trend={percentTrend(revenue, prevRevenue)} helpText={period.comparisonLabel} />
          </div>
        </Link>
        <Link href="/owner/finances?tab=expenses" className="group block">
          <div className="transition-colors group-hover:[&>div]:border-primary/40">
            <StatCard label="Expenses" value={formatCurrency(totalExpenses)} icon={Receipt} trend={percentTrend(totalExpenses, prevExpenses, { invert: true })} helpText={period.comparisonLabel} />
          </div>
        </Link>
        <StatCard
          label="Net Profit"
          value={formatCurrency(netProfit)}
          icon={PiggyBank}
          trend={percentTrend(netProfit, prevNetProfit)}
          helpText={pendingAmount > 0 ? `excl. ${formatCurrency(pendingAmount)} pending` : period.comparisonLabel}
        />
        <StatCard label="Profit Margin" value={`${profitMargin}%`} icon={Percent} helpText="of revenue, this period" />
        <Link href="/owner/finances?tab=expenses&status=pending" className="group block">
          <div className="transition-colors group-hover:[&>div]:border-primary/40">
            <StatCard label="Pending Expenses" value={formatCurrency(pendingAmount)} icon={Clock} helpText={`${pendingCount} awaiting payment`} />
          </div>
        </Link>
        <StatCard
          label="Recurring Expenses"
          value={formatCurrency(recurringSplit.recurring)}
          icon={RefreshCcw}
          helpText={totalExpenses > 0 ? `${Math.round((recurringSplit.recurring / totalExpenses) * 100)}% of spend` : "this period"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Revenue vs. expenses — 6-month trend</CardTitle>
            <CardDescription>Whole-business monthly totals</CardDescription>
          </div>
          <CardAction>
            <Button variant="ghost" size="sm" asChild className="no-print">
              <Link href="/owner/reports?tab=revenue">
                Full revenue report
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent><ProfitTrendChart data={trendPoints} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
            <CardDescription>{period.label} · paid expenses only</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <EmptyState icon={Receipt} title="No expenses in this period" description="No paid expenses landed in this date range." />
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((cat) => (
                  <Link
                    key={cat.category}
                    href={`/owner/finances?tab=expenses&category=${encodeURIComponent(cat.category)}`}
                    className="block rounded-md transition-colors hover:bg-muted/40"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{cat.category}</span>
                      <span className="font-medium tabular text-foreground">{formatCurrency(cat.amount)} · {cat.share}%</span>
                    </div>
                    <Progress value={cat.share} className="mt-1" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring vs. one-time</CardTitle>
            <CardDescription>{period.label} · how predictable is your spend?</CardDescription>
          </CardHeader>
          <CardContent>
            {recurringSplit.recurring + recurringSplit.oneTime === 0 ? (
              <EmptyState icon={RefreshCcw} title="No expenses in this period" description="No paid expenses landed in this date range." />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Recurring</span><span className="font-medium tabular text-foreground">{formatCurrency(recurringSplit.recurring)}</span></div>
                  <Progress value={(recurringSplit.recurring / (recurringSplit.recurring + recurringSplit.oneTime)) * 100} className="mt-1" />
                </div>
                <div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">One-time</span><span className="font-medium tabular text-foreground">{formatCurrency(recurringSplit.oneTime)}</span></div>
                  <Progress value={(recurringSplit.oneTime / (recurringSplit.recurring + recurringSplit.oneTime)) * 100} className="mt-1" indicatorClassName="bg-info" />
                </div>
                {largestCategory && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Largest category this period: <span className="font-medium text-foreground">{largestCategory.category}</span> at {formatCurrency(largestCategory.amount)}.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NeedsAttention alerts={insights} />

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent expenses</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild className="no-print">
                <Link href="/owner/finances?tab=expenses">
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <EmptyState icon={Receipt} title="No expenses recorded" description="Add your first expense from the Expenses tab." />
            ) : (
              <div className="space-y-1">
                {recentExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.category} · {formatDate(e.date)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {e.recurring && <Badge variant="outline" className="hidden sm:inline-flex"><RefreshCcw />{e.frequency}</Badge>}
                      <span className="text-sm font-medium tabular text-foreground">{formatCurrency(e.amount)}</span>
                      <ExpenseStatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
