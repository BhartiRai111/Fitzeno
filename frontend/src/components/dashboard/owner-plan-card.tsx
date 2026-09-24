"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Users, Archive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanDialog } from "@/components/dashboard/dialogs/plan-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { formatCurrency } from "@/lib/utils-data";
import type { Member, MembershipPlan } from "@/lib/data/types";

export function OwnerPlanCard({ plan, members }: { plan: MembershipPlan; members: Member[] }) {
  const activeCount = members.filter((m) => m.plan === plan.name && m.status === "active").length;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{plan.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{plan.description}</p>
        </div>
        {plan.popular && <Badge variant="primary">Popular</Badge>}
      </div>
      <p className="mt-4 font-display text-2xl font-bold tabular text-foreground">
        {formatCurrency(plan.price)}
        <span className="text-sm font-normal text-muted-foreground">/{plan.billingPeriod}</span>
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {plan.perks.slice(0, 3).map((perk) => (
          <li key={perk} className="truncate">· {perk}</li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="size-4" />
        {activeCount} active members
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button asChild size="sm" variant="outline">
          <Link href={`/owner/members?plan=${plan.name}`}>View Members</Link>
        </Button>
        <PlanDialog plan={plan} trigger={<Button size="sm" variant="outline">Edit</Button>} />
        <ConfirmActionDialog
          trigger={
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground">
              <Archive className="size-4" />
              Archive
            </Button>
          }
          title={`Archive ${plan.name}?`}
          description="Existing members keep this plan until they renew or switch. New signups won't see it."
          confirmLabel="Archive Plan"
          onConfirm={() => toast.success(`${plan.name} archived`)}
        />
      </div>
    </Card>
  );
}
