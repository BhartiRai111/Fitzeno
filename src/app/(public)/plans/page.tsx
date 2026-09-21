import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { PlanCard } from "@/components/public/plan-card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { membershipPlans } from "@/lib/data/plans";
import { faqs } from "@/lib/data/testimonials";

export const metadata: Metadata = {
  title: "Membership Plans",
};

const comparisonRows = [
  { feature: "Gym floor access", basic: true, growth: true, elite: true },
  { feature: "Locker & shower access", basic: true, growth: true, elite: true },
  { feature: "Group classes", basic: "1 credit / mo", growth: "Unlimited", elite: "Unlimited" },
  { feature: "Priority class booking", basic: false, growth: true, elite: true },
  { feature: "Personal training sessions", basic: false, growth: "1 / mo", elite: "4 / mo" },
  { feature: "Guest passes", basic: false, growth: "2 / mo", elite: "Unlimited" },
  { feature: "Nutrition coaching", basic: false, growth: false, elite: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-sm text-foreground">{value}</span>;
  return value ? (
    <Check className="mx-auto size-4 text-primary" />
  ) : (
    <X className="mx-auto size-4 text-muted-foreground/50" />
  );
}

export default function PlansPage() {
  const billingFaqs = faqs.filter((f) => f.category === "Payments" || f.category === "Membership");

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Membership Plans"
        title="Choose the plan that matches your training."
        description="Every plan starts with a free trial, no long-term contract required — cancel or switch plans any time."
        align="center"
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
        {membershipPlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <div className="mt-20">
        <h2 className="text-center font-display text-2xl font-bold text-foreground">
          Compare plans in detail
        </h2>
        <div className="mt-8 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Feature</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Basic</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Growth</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Elite</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3.5 font-medium text-foreground">{row.feature}</td>
                  <td className="px-4 py-3.5 text-center"><Cell value={row.basic} /></td>
                  <td className="px-4 py-3.5 text-center"><Cell value={row.growth} /></td>
                  <td className="px-4 py-3.5 text-center"><Cell value={row.elite} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-2xl">
        <h2 className="text-center font-display text-2xl font-bold text-foreground">
          Billing questions
        </h2>
        <Accordion type="single" collapsible className="mt-6">
          {billingFaqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
