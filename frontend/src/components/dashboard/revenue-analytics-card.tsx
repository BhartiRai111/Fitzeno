"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils-data";
import { revenueByDay, revenueByWeek, revenueByMonth, revenueByCategory } from "@/lib/data/payments";

const periods = {
  day: { data: revenueByDay, xKey: "label", label: "Last 14 days" },
  week: { data: revenueByWeek, xKey: "label", label: "Last 8 weeks" },
  month: { data: revenueByMonth, xKey: "month", label: "Last 6 months" },
} as const;

type Period = keyof typeof periods;

export function RevenueAnalyticsCard() {
  const [period, setPeriod] = React.useState<Period>("month");
  const { data, xKey, label } = periods[period];
  const current = data[data.length - 1].revenue;
  const previous = data[data.length - 2].revenue;
  const growth = previous ? (((current - previous) / previous) * 100).toFixed(1) : "0.0";
  const isPositive = Number(growth) >= 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Revenue analytics</CardTitle>
          <CardDescription>{label}</CardDescription>
        </div>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/owner/reports?tab=revenue">
              Full report
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">Daily</TabsTrigger>
            <TabsTrigger value="week">Weekly</TabsTrigger>
            <TabsTrigger value="month">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="font-display text-2xl font-bold tabular text-foreground">{formatCurrency(current)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Previous period</p>
            <p className="font-display text-2xl font-bold tabular text-muted-foreground">{formatCurrency(previous)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Growth</p>
            <p
              className={cn(
                "flex items-center gap-1 font-display text-2xl font-bold tabular",
                isPositive ? "text-success" : "text-danger"
              )}
            >
              {isPositive ? <ArrowUpRight className="size-5" /> : <ArrowDownRight className="size-5" />}
              {growth}%
            </p>
          </div>
        </div>

        <div className="mt-4">
          <RevenueChart data={data as never} xKey={xKey} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-5">
          {revenueByCategory.map((cat) => (
            <div key={cat.category}>
              <p className="truncate text-xs text-muted-foreground">{cat.category}</p>
              <p className="font-medium tabular text-foreground">{formatCurrency(cat.amount)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
