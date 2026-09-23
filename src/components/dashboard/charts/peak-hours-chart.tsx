"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { peakHours } from "@/lib/data/attendance";

export function PeakHoursChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={peakHours} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 8" stroke="var(--color-border)" />
        <XAxis
          dataKey="hour"
          axisLine={false}
          tickLine={false}
          interval={1}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 8px 20px rgb(var(--shadow-color) / 0.12)",
          }}
          formatter={(value) => [`${value} visits`, "Traffic"]}
        />
        <Bar dataKey="visits" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
