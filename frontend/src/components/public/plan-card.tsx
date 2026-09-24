import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MembershipPlan } from "@/lib/data/types";

export function PlanCard({ plan }: { plan: MembershipPlan }) {
  return (
    <Card
      className={cn(
        "relative flex flex-col p-6 sm:p-7",
        plan.popular && "border-primary/50 shadow-elevation-md ring-1 ring-primary/20"
      )}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-elevation-sm">
          <Sparkles className="size-3.5" />
          Most Popular
        </span>
      )}
      <h3 className="font-display text-lg font-semibold text-foreground">{plan.name}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold tabular tracking-tight text-foreground">
          £{plan.price}
        </span>
        <span className="text-sm text-muted-foreground">/ {plan.billingPeriod}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {perk}
          </li>
        ))}
      </ul>
      <Button asChild className="mt-7" variant={plan.popular ? "primary" : "outline"}>
        <Link href={`/register?plan=${plan.id}`}>Choose {plan.name}</Link>
      </Button>
    </Card>
  );
}
