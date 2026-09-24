"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  X,
  RefreshCcw,
  ArrowRightLeft,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { MembershipStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { InvoiceDialog } from "@/components/dashboard/dialogs/invoice-dialog";
import { MembershipPurchaseDialog } from "@/components/portal/membership-purchase-dialog";
import { useMembership } from "@/components/portal/membership-provider";
import { membershipPlans, planComparisonRows } from "@/lib/data/plans";
import { addMonths } from "@/lib/membership-helpers";
import { TODAY } from "@/lib/booking-helpers";
import { formatCurrency, formatDate, daysBetween } from "@/lib/utils-data";
import { cn } from "@/lib/utils";

type TabValue = "overview" | "plans" | "history";

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-sm text-foreground">{value}</span>;
  return value ? (
    <Check className="mx-auto size-4 text-primary" />
  ) : (
    <X className="mx-auto size-4 text-muted-foreground/50" />
  );
}

export function MembershipPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "overview";
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  const { member, paymentHistory, daysLeft, isExpiringSoon, membershipBlock, toggleAutoRenew } = useMembership();
  const currentPlan = membershipPlans.find((p) => p.name === member.plan);

  const [purchaseOpen, setPurchaseOpen] = React.useState(false);
  const [purchasePlanId, setPurchasePlanId] = React.useState<string | undefined>();

  function openPurchase(planId?: string) {
    setPurchasePlanId(planId);
    setPurchaseOpen(true);
  }

  const cycleMonths = currentPlan?.billingPeriod === "year" ? -12 : -1;
  const cycleStart = addMonths(member.expiresOn, cycleMonths);
  const cycleLength = Math.max(1, daysBetween(cycleStart, member.expiresOn));
  const cycleElapsed = Math.min(cycleLength, Math.max(0, daysBetween(cycleStart, TODAY)));
  const cyclePct = Math.round((cycleElapsed / cycleLength) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership"
        description="Your plan, billing, and payment history in one place."
        actions={
          <Button size="sm" onClick={() => openPurchase(currentPlan?.id)}>
            <RefreshCcw className="size-4" />
            Renew Now
          </Button>
        }
      />

      {membershipBlock && (
        <Card className="flex flex-col gap-3 border-danger/30 bg-danger-tint p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-semibold text-foreground">{membershipBlock.title}</p>
              <p className="text-sm text-muted-foreground">{membershipBlock.detail}</p>
            </div>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => openPurchase(currentPlan?.id)}>
            Reactivate Membership
          </Button>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="history">Payment History ({paymentHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {member.plan} Plan
                    <MembershipStatusBadge status={member.status} />
                  </CardTitle>
                  <CardDescription>
                    {currentPlan && `${formatCurrency(currentPlan.price)} / ${currentPlan.billingPeriod}`}
                  </CardDescription>
                </div>
                {isExpiringSoon && !membershipBlock && (
                  <Badge variant="warning">Renews in {daysLeft} day{daysLeft === 1 ? "" : "s"}</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Billing cycle</span>
                    <span className="font-medium tabular text-foreground">
                      {daysLeft > 0
                        ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`
                        : daysLeft === 0
                          ? "Expires today"
                          : `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`}
                    </span>
                  </div>
                  <Progress
                    value={cyclePct}
                    className="mt-2"
                    indicatorClassName={cn(daysLeft <= 3 && "bg-danger", daysLeft > 3 && daysLeft <= 14 && "bg-warning")}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatDate(cycleStart)} — {formatDate(member.expiresOn)}
                  </p>
                </div>

                {member.paymentStatus !== "paid" && (
                  <div className="flex items-start gap-2.5 rounded-md bg-warning-tint px-3 py-2.5 text-sm text-warning">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Your last payment is <strong className="font-medium">{member.paymentStatus}</strong>. Update your
                      payment method to avoid interruption.
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto-renew</p>
                    <p className="text-sm text-muted-foreground">
                      {member.autoRenew
                        ? "Your payment method on file will be charged automatically."
                        : "You'll need to renew manually before your plan expires."}
                    </p>
                  </div>
                  <Switch checked={!!member.autoRenew} onCheckedChange={toggleAutoRenew} aria-label="Toggle auto-renew" />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={() => openPurchase(currentPlan?.id)}>
                    <RefreshCcw className="size-4" />
                    Renew Now
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setTab("plans")}>
                    <ArrowRightLeft className="size-4" />
                    Compare &amp; Switch Plans
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What&apos;s included</CardTitle>
                <CardDescription>{member.plan} plan benefits</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {currentPlan?.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {membershipPlans.map((plan) => {
              const isCurrent = plan.name === member.plan;
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col p-5",
                    plan.popular && !isCurrent && "border-primary/50 ring-1 ring-primary/20"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-elevation-sm">
                      <Sparkles className="size-3.5" />
                      Most Popular
                    </span>
                  )}
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-lg font-semibold text-foreground">{plan.name}</h3>
                    {isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold tabular tracking-tight text-foreground">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {plan.billingPeriod}</span>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-sm text-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6"
                    variant={isCurrent ? "outline" : plan.popular ? "primary" : "outline"}
                    onClick={() => openPurchase(plan.id)}
                  >
                    {isCurrent ? "Renew Now" : `Switch to ${plan.name}`}
                  </Button>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-border p-4">
              <p className="font-display text-sm font-semibold text-foreground">Compare plans in detail</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Feature</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Basic</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Growth</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Elite</th>
                  </tr>
                </thead>
                <tbody>
                  {planComparisonRows.map((row) => (
                    <tr key={row.feature} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{row.feature}</td>
                      <td className="px-4 py-3 text-center"><ComparisonCell value={row.basic} /></td>
                      <td className="px-4 py-3 text-center"><ComparisonCell value={row.growth} /></td>
                      <td className="px-4 py-3 text-center"><ComparisonCell value={row.elite} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          {paymentHistory.length === 0 ? (
            <EmptyState icon={Receipt} title="No payments yet" description="Your membership payments will show up here." />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.date)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{payment.plan}</td>
                        <td className="px-4 py-3 tabular text-foreground">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{payment.method}</td>
                        <td className="px-4 py-3"><PaymentStatusBadge status={payment.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{payment.invoiceId}</td>
                        <td className="px-4 py-3 text-right">
                          <InvoiceDialog payment={payment} trigger={<Button size="sm" variant="ghost">View</Button>} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <MembershipPurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} initialPlanId={purchasePlanId} />
    </div>
  );
}
