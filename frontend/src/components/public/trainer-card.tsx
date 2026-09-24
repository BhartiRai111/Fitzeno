import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/lib/data/types";

const colorMap: Record<Trainer["color"], string> = {
  indigo: "bg-brand-indigo-100 text-brand-indigo-700 dark:bg-brand-indigo-900 dark:text-brand-indigo-200",
  lime: "bg-brand-lime-400/30 text-neutral-800 dark:text-brand-lime-400",
  amber: "bg-warning-tint text-warning",
  sky: "bg-info-tint text-info",
};

export function TrainerCard({ trainer }: { trainer: Trainer }) {
  return (
    <Card className="group p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevation-md">
      <Avatar className={cn("size-16", colorMap[trainer.color])}>
        <AvatarFallback className={cn("text-lg font-semibold", colorMap[trainer.color])}>
          {trainer.initials}
        </AvatarFallback>
      </Avatar>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">{trainer.name}</h3>
      <p className="text-sm text-muted-foreground">{trainer.role}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {trainer.specialties.map((s) => (
          <Badge key={s} variant="outline">
            {s}
          </Badge>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{trainer.bio}</p>
      <div className="mt-4 flex items-center gap-1.5 text-sm">
        <Star className="size-4 fill-brand-lime text-brand-lime" />
        <span className="font-medium text-foreground">{trainer.rating}</span>
        <span className="text-muted-foreground">({trainer.reviewCount} reviews)</span>
      </div>
    </Card>
  );
}
