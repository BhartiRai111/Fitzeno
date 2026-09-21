import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { PlanCard } from "@/components/public/plan-card";
import { Button } from "@/components/ui/button";
import { membershipPlans } from "@/lib/data/plans";

export function PlansTeaser() {
  return (
    <section id="plans" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Membership Plans"
        title="Simple pricing. No hidden fees."
        description="Every plan includes full gym floor access — choose based on how much coaching and class access you want."
        align="center"
      />
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
        {membershipPlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button variant="ghost" asChild>
          <Link href="/plans">
            Compare full plan details
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
