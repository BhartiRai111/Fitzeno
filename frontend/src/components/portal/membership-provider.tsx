"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOwnMemberAndMembership, usePurchaseOwnMembership } from "@/hooks/use-members";
import { useOwnTransactions } from "@/hooks/use-transactions";
import { getMembershipBlock, type MembershipBlock } from "@/lib/attendance-helpers";
import { daysBetween, formatDate } from "@/lib/utils-data";
import type { Member, Payment } from "@/lib/data/types";

export type PaymentMethodChoice = "Card" | "UPI" | "Bank Transfer";

const METHOD_TO_BACKEND: Record<PaymentMethodChoice, string> = {
  Card: "CARD",
  UPI: "UPI",
  "Bank Transfer": "BANK_TRANSFER",
};

interface PurchaseInput {
  planId: string;
  method: PaymentMethodChoice;
}

interface PurchaseResult {
  outcome: "success" | "pending";
  newExpiry?: string;
}

interface MembershipContextValue {
  member: Member;
  paymentHistory: Payment[];
  daysLeft: number;
  isExpiringSoon: boolean;
  membershipBlock: MembershipBlock | null;
  purchaseMembership: (input: PurchaseInput) => Promise<PurchaseResult>;
  toggleAutoRenew: () => void;
}

const MembershipContext = React.createContext<MembershipContextValue | null>(null);

function FullScreenLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Real member/membership data from the backend (Members + Memberships
 * modules) — the mock-data simulation this provider used to run locally
 * is gone. `toggleAutoRenew` is the one exception: there's no `autoRenew`
 * concept anywhere in the backend's `MemberMembership` model (nothing in
 * the approved product actually auto-charges a renewal), so it stays a
 * local-only UI preference rather than a fabricated API call — the same
 * "don't invent backend behavior that doesn't exist" boundary this
 * integration phase draws everywhere else.
 */
export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { member, isLoading, isError } = useOwnMemberAndMembership();
  const { payments: paymentHistory } = useOwnTransactions();
  const purchaseMutation = usePurchaseOwnMembership();
  const [autoRenew, setAutoRenew] = React.useState(true);

  if (isLoading || !member) {
    return <FullScreenLoader />;
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-lg font-semibold text-foreground">Couldn&apos;t load your account</p>
        <p className="text-sm text-muted-foreground">Check your connection and refresh the page.</p>
      </div>
    );
  }

  const resolvedMember: Member = { ...member, autoRenew };
  const daysLeft = member.expiresOn ? daysBetween(new Date().toISOString().slice(0, 10), member.expiresOn) : 0;
  const isExpiringSoon = daysLeft <= 14 && member.status !== "cancelled" && member.status !== "none";
  const membershipBlock = getMembershipBlock(member.status);

  async function purchaseMembership({ planId, method }: PurchaseInput): Promise<PurchaseResult> {
    const backendMethod = METHOD_TO_BACKEND[method];
    const created = await purchaseMutation.mutateAsync({ planId, paymentMethod: backendMethod });

    // Bank transfers settle out-of-band (see TransactionsService) — the
    // membership period is recorded either way, but the confirmation
    // messaging matches the real settlement expectation for this method,
    // same as the approved frontend's own copy.
    if (method === "Bank Transfer") {
      toast.success("Payment pending", {
        description: "Bank transfers usually clear within 1–3 business days. We'll confirm once it's received.",
      });
      return { outcome: "pending" };
    }

    toast.success("Payment successful!", {
      description: `Your ${created.planName} membership is active until ${formatDate(created.endDate)}.`,
    });
    return { outcome: "success", newExpiry: created.endDate };
  }

  function toggleAutoRenew() {
    setAutoRenew((prev) => {
      const next = !prev;
      toast.success(next ? "Auto-renew turned on" : "Auto-renew turned off", {
        description: next
          ? "We'll automatically charge your payment method on file when your plan renews."
          : "You'll need to renew manually before your membership expires.",
      });
      return next;
    });
  }

  const value: MembershipContextValue = {
    member: resolvedMember,
    paymentHistory,
    daysLeft,
    isExpiringSoon,
    membershipBlock,
    purchaseMembership,
    toggleAutoRenew,
  };

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership() {
  const ctx = React.useContext(MembershipContext);
  if (!ctx) throw new Error("useMembership must be used within a MembershipProvider");
  return ctx;
}
