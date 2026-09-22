"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Smartphone,
  Tag,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/shared/empty-state";
import { membershipPlans } from "@/lib/data/plans";
import { offers } from "@/lib/data/testimonials";
import { applyOfferToPrice } from "@/lib/membership-helpers";
import { TODAY } from "@/lib/booking-helpers";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import { cn } from "@/lib/utils";

type Method = "Card" | "UPI" | "Bank Transfer";
type Step = "review" | "success" | "pending";

const methodOptions: { value: Method; label: string; icon: typeof CreditCard; note: string }[] = [
  { value: "Card", label: "Card", icon: CreditCard, note: "Charged instantly" },
  { value: "UPI", label: "UPI", icon: Smartphone, note: "Charged instantly" },
  { value: "Bank Transfer", label: "Bank Transfer", icon: Landmark, note: "Takes 1–3 business days" },
];

export function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");
  const offerCode = searchParams.get("offer");

  const plan = membershipPlans.find((p) => p.id === planId);
  const offer = offerCode ? offers.find((o) => o.code.toLowerCase() === offerCode.toLowerCase()) : undefined;
  const offerApplies = !!(offer && plan && offer.applicablePlans.includes(plan.id));

  const [method, setMethod] = React.useState<Method>("Card");
  const [submitting, setSubmitting] = React.useState(false);
  const [step, setStep] = React.useState<Step>("review");

  if (!plan) {
    return (
      <div className="w-full max-w-md">
        <Card className="shadow-elevation-lg">
          <EmptyState
            icon={Tag}
            title="No plan selected"
            description="Pick a membership plan to continue to checkout."
            action={{ label: "Browse Plans", href: "/plans" }}
            className="border-0"
          />
        </Card>
      </div>
    );
  }

  const price = offerApplies ? applyOfferToPrice(plan.price, offer!.discount) : plan.price;

  function handleConfirm() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(method === "Bank Transfer" ? "pending" : "success");
    }, 1000);
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Card className="shadow-elevation-lg">
        {step === "success" ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
              <CheckCircle2 className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">Welcome to Fitzeno!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your {plan.name} membership is now active. Let&apos;s get you booked into your first session.
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push("/portal")}>
              Go to Dashboard
            </Button>
          </div>
        ) : step === "pending" ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-warning-tint text-warning">
              <Clock className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">Almost there!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your account is ready — we&apos;ll activate your {plan.name} membership as soon as your bank transfer
                clears, usually within 1–3 business days.
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push("/portal")}>
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <>
            <CardHeader className="items-center text-center">
              <Logo iconOnly size="lg" href="" />
              <CardTitle className="mt-2">Complete your purchase</CardTitle>
              <CardDescription>You&apos;re one step away from your first workout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{plan.name} plan</span>
                  <span className="font-display text-lg font-bold tabular text-foreground">
                    {formatCurrency(plan.price)}
                    <span className="text-xs font-normal text-muted-foreground">/{plan.billingPeriod}</span>
                  </span>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {plan.perks.slice(0, 4).map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              {offerApplies && (
                <div className="flex items-center gap-2 rounded-md border border-brand-lime-500/40 bg-brand-lime-400/10 px-3 py-2 text-sm text-foreground">
                  <Tag className="size-4 shrink-0" />
                  <span>
                    <strong>{offer!.code}</strong> applied — {offer!.discount} your first payment
                  </span>
                </div>
              )}

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
                {offerApplies && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Regular price</span>
                    <span className="tabular line-through">{formatCurrency(plan.price)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-foreground">Total due today</span>
                  <span className="font-display tabular text-foreground">{formatCurrency(price)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Starts today · renews monthly from {formatDate(TODAY)}. Cancel any time.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button type="button" className="w-full" loading={submitting} onClick={handleConfirm}>
                Confirm &amp; Pay {formatCurrency(price)}
              </Button>
              <Separator />
              <p className="text-center text-xs text-muted-foreground">
                <Link href="/portal" className="hover:text-foreground">
                  Skip for now — I&apos;ll choose a plan later
                </Link>
              </p>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
