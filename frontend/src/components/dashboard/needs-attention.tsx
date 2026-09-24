import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertItem } from "@/lib/data/types";

const severityStyles: Record<AlertItem["severity"], { icon: typeof AlertTriangle; className: string }> = {
  high: { icon: AlertCircle, className: "bg-danger-tint text-danger" },
  medium: { icon: AlertTriangle, className: "bg-warning-tint text-warning" },
  low: { icon: Info, className: "bg-info-tint text-info" },
};

export function NeedsAttention({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs your attention</CardTitle>
        <CardDescription>Items that could affect revenue or retention</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description="No outstanding issues right now — nice work."
          />
        ) : (
          <div className="space-y-1">
            {alerts.map((alert) => {
              const style = severityStyles[alert.severity];
              const Icon = style.icon;
              return (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", style.className)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1 text-sm text-foreground">{alert.message}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
