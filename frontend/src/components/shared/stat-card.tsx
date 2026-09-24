import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down";
    positive?: boolean;
  };
  helpText?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, helpText, className }: StatCardProps) {
  const trendPositive = trend?.positive ?? trend?.direction === "up";

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="size-[18px]" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular tracking-tight text-foreground">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-medium",
              trendPositive ? "bg-success-tint text-success" : "bg-danger-tint text-danger"
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {trend.value}
          </span>
        )}
        {helpText && <span className="text-muted-foreground">{helpText}</span>}
      </div>
    </Card>
  );
}
