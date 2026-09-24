import type { Lead } from "@/lib/data/types";

export function LeadFunnel({ leads }: { leads: Lead[] }) {
  const stages: { label: string; count: number }[] = [
    { label: "New", count: leads.filter((l) => l.status === "new").length },
    { label: "Contacted", count: leads.filter((l) => l.status === "contacted").length },
    { label: "Trial Booked", count: leads.filter((l) => l.status === "trial-booked").length },
    { label: "Trial Attended", count: leads.filter((l) => l.status === "trial-attended").length },
    { label: "Converted", count: leads.filter((l) => l.status === "converted").length },
  ];
  const funnelMax = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div key={stage.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{stage.label}</span>
            <span className="font-medium tabular text-foreground">{stage.count}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(stage.count / funnelMax) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
