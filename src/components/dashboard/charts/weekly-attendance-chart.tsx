"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { weeklyAttendance } from "@/lib/data/attendance";

export function WeeklyAttendanceChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={weeklyAttendance} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 8" stroke="var(--color-border)" />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 8px 20px rgb(var(--shadow-color) / 0.12)",
          }}
          formatter={(value) => [`${value} visits`, "Attendance"]}
        />
        <Bar dataKey="visits" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
