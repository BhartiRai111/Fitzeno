"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMembership, type PaymentMethodChoice } from "@/components/portal/membership-provider";
import { membershipPlans } from "@/lib/data/plans";
import { computeNextExpiry } from "@/lib/membership-helpers";
import { TODAY } from "@/lib/booking-helpers";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import { cn } from "@/lib/utils";

interface MembershipPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlanId?: string;
}

const methodOptions: { value: PaymentMethodChoice; label: string; icon: typeof CreditCard; note: string }[] = [
  { value: "Card", label: "Card", icon: CreditCard, note: "Charged instantly" },
  { value: "UPI", label: "UPI", icon: Smartphone, note: "Charged instantly" },
  { value: "Bank Transfer", label: "Bank Transfer", icon: Landmark, note: "Takes 1–3 business days" },
];

export function MembershipPurchaseDialog({ open, onOpenChange, initialPlanId }: MembershipPurchaseDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { member, purchaseMembership } = useMembership();
  const currentPlan = membershipPlans.find((p) => p.name === member.plan);

  const [planId, setPlanId] = React.useState(initialPlanId ?? currentPlan?.id ?? membershipPlans[0].id);
  const [method, setMethod] = React.useState<PaymentMethodChoice>("Card");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<"success" | "pending" | null>(null);
  const [confirmedExpiry, setConfirmedExpiry] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Intentional: reset the flow each time this dialog reopens.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlanId(initialPlanId ?? currentPlan?.id ?? membershipPlans[0].id);
      setMethod("Card");
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPlanId]);

  const Header = isDesktop ? DialogHeader : SheetHeader;
  const Title = isDesktop ? DialogTitle : SheetTitle;
  const Description = isDesktop ? DialogDescription : SheetDescription;
  const Footer = isDesktop ? DialogFooter : SheetFooter;

  const selectedPlan = membershipPlans.find((p) => p.id === planId) ?? membershipPlans[0];
  const isSamePlan = selectedPlan.name === member.plan;
  const newExpiry = computeNextExpiry(member.expiresOn, TODAY, selectedPlan.billingPeriod);

  function handleConfirm() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const outcome = purchaseMembership({ planId: selectedPlan.id, method });
      setResult(outcome.outcome);
      setConfirmedExpiry(outcome.newExpiry ?? null);
    }, 1000);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} contentClassName="sm:max-w-lg">
      {result === "success" ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
            <CheckCircle2 className="size-9" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">Payment successful!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your {selectedPlan.name} membership is active until {confirmedExpiry ? formatDate(confirmedExpiry) : ""}.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button asChild className="flex-1">
              <Link href="/portal" onClick={() => onOpenChange(false)}>
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      ) : result === "pending" ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-warning-tint text-warning">
            <Clock className="size-9" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">Payment pending</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;re waiting on your bank transfer to clear — usually within 1–3 business days. Your current
              membership stays active until then.
            </p>
          </div>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      ) : (
        <>
          <Header>
            <Title>{isSamePlan ? "Renew your membership" : "Switch plan"}</Title>
            <Description>Review your plan and choose how you&apos;d like to pay.</Description>
          </Header>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {membershipPlans.map((plan) => {
                const selected = plan.id === planId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    className={cn(
                      "relative flex flex-col rounded-md border p-3 text-left transition-colors",
                      selected ? "border-primary bg-accent/50 ring-1 ring-primary/30" : "border-border hover:bg-muted/40"
                    )}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        <Sparkles className="size-2.5" />
                        Popular
                      </span>
                    )}
                    <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                    <span className="mt-0.5 font-display text-lg font-bold tabular text-foreground">
                      {formatCurrency(plan.price)}
                      <span className="text-xs font-normal text-muted-foreground">/{plan.billingPeriod}</span>
                    </span>
                    {plan.name === member.plan && (
                      <span className="mt-1 text-[11px] font-medium text-muted-foreground">Current plan</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-md border border-border p-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What&apos;s included
              </p>
              <ul className="space-y-1">
                {selectedPlan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {methodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMethod(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border p-2.5 text-center transition-colors",
                      method === opt.value ? "border-primary bg-accent/50" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <opt.icon className="size-4 text-foreground" />
                    <span className="text-xs font-medium text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {methodOptions.find((m) => m.value === method)?.note}
              </p>
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{selectedPlan.name} plan</span>
                <span className="tabular text-foreground">{formatCurrency(selectedPlan.price)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span className="text-foreground">Total due today</span>
                <span className="font-display tabular text-foreground">{formatCurrency(selectedPlan.price)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isSamePlan ? "Extends" : "Activates"} your membership until {formatDate(newExpiry)}.
              </p>
            </div>
          </div>

          <Footer className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" loading={submitting} onClick={handleConfirm}>
              {isSamePlan ? "Renew Now" : `Switch to ${selectedPlan.name}`}
            </Button>
          </Footer>
        </>
      )}
    </ResponsiveDialog>
  );
}
