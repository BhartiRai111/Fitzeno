"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DistributionSlice {
  label: string;
  value: number;
  color: string;
}

const COLORS: Record<string, string> = {
  active: "var(--color-success)",
  expiring: "var(--color-warning)",
  expired: "var(--color-danger)",
  frozen: "var(--color-info)",
  cancelled: "var(--color-muted-foreground)",
};

export function MembershipDistributionChart({ data }: { data: DistributionSlice[] }) {
  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={44}
            outerRadius={64}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((slice) => (
              <Cell key={slice.label} fill={COLORS[slice.color] ?? "var(--color-muted-foreground)"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 13,
              boxShadow: "0 8px 20px rgb(var(--shadow-color) / 0.12)",
            }}
            formatter={(value, name) => [`${value} members`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2.5">
        {data.map((slice) => (
          <div key={slice.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: COLORS[slice.color] ?? "var(--color-muted-foreground)" }}
              />
              {slice.label}
            </span>
            <span className="font-medium tabular text-foreground">{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
