import type { LucideIcon } from "lucide-react";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon = Hammer }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card className="flex flex-col items-center justify-center gap-3 border-dashed px-6 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-base font-semibold text-foreground">
            This module is part of the next build phase
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            The foundational UI, navigation, and dashboards are in place — this screen will be
            built out in the next implementation phase.
          </p>
        </div>
      </Card>
    </div>
  );
}
