import { UserPlus, CreditCard, CalendarCheck, RefreshCcw, UserCog, QrCode, UserRoundPlus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/data/types";

const iconMap: Record<ActivityItem["type"], { icon: typeof UserPlus; className: string }> = {
  "member-joined": { icon: UserPlus, className: "bg-success-tint text-success" },
  payment: { icon: CreditCard, className: "bg-info-tint text-info" },
  booking: { icon: CalendarCheck, className: "bg-accent text-accent-foreground" },
  renewal: { icon: RefreshCcw, className: "bg-success-tint text-success" },
  trainer: { icon: UserCog, className: "bg-accent text-accent-foreground" },
  "check-in": { icon: QrCode, className: "bg-accent text-accent-foreground" },
  lead: { icon: UserRoundPlus, className: "bg-warning-tint text-warning" },
};

export function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activity.map((item) => {
          const config = iconMap[item.type];
          const Icon = config.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", config.className)}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {item.description} <span className="font-medium">— {item.person}</span>
                </p>
                <p className="text-xs text-muted-foreground">{item.timestamp}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
