"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TrendBarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  valueLabel?: string;
}

export function TrendBarChart({
  data,
  xKey,
  yKey,
  height = 220,
  color = "var(--color-primary)",
  valueLabel = "Value",
}: TrendBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 8" stroke="var(--color-border)" />
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 8px 20px rgb(16 19 34 / 0.12)",
          }}
          labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
          formatter={(value) => [Number(value).toLocaleString(), valueLabel]}
        />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
