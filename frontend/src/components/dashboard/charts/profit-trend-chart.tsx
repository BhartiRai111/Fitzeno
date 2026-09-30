"use client";

import { Bar, ComposedChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ProfitTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

function monthLabel(month: string): string {
  // "YYYY-MM" -> "Jan"
  const [year, m] = month.split("-");
  if (!year || !m) return month;
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "short" });
}

export function ProfitTrendChart({ data: rawData }: { data: ProfitTrendPoint[] }) {
  const data = rawData.map((d) => ({ ...d, month: monthLabel(d.month) }));
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const useThousands = max >= 2000;
  const formatValue = (value: number) =>
    useThousands ? `£${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `£${value}`;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 8" stroke="var(--color-border)" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          tickFormatter={(value) => formatValue(value)}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 8px 20px rgb(var(--shadow-color) / 0.12)",
          }}
          labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
          formatter={(value, name) => [`£${Number(value).toLocaleString()}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill="var(--color-danger)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line type="monotone" dataKey="net" name="Net profit" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
