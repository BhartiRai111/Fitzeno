"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { revenueByMonth } from "@/lib/data/payments";

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 8" stroke="var(--color-border)" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          tickFormatter={(value) => `£${value / 1000}k`}
          width={56}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 8px 20px rgb(16 19 34 / 0.12)",
          }}
          labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
          formatter={(value) => [`£${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
