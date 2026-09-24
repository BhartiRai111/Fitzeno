"use client";

import * as React from "react";
import { toast } from "sonner";
import { members as initialMembers } from "@/lib/data/members";
import { payments as initialPayments } from "@/lib/data/payments";
import { DEMO_MEMBER_ID, TODAY } from "@/lib/booking-helpers";
import { getMembershipBlock, type MembershipBlock } from "@/lib/attendance-helpers";
import { getPlanById, computeNextExpiry } from "@/lib/membership-helpers";
import { daysBetween, formatDate } from "@/lib/utils-data";
import { useAuth } from "@/lib/auth/auth-context";
import { toInitials } from "@/lib/api/enum-maps";
import type { Member, Payment } from "@/lib/data/types";

export type PaymentMethodChoice = "Card" | "UPI" | "Bank Transfer";

interface PurchaseInput {
  planId: string;
  method: PaymentMethodChoice;
  priceOverride?: number;
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
  purchaseMembership: (input: PurchaseInput) => PurchaseResult;
  toggleAutoRenew: () => void;
}

const MembershipContext = React.createContext<MembershipContextValue | null>(null);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  // Real identity from the authenticated session (RequireAuth guarantees `user`
  // is resolved before this provider ever mounts — see portal/layout.tsx). The
  // plan/status/expiry/payment simulation below is still local-only — the
  // Memberships/Bookings backend integration for the member portal is a
  // follow-up phase (see session report).
  const { user } = useAuth();
  const baseMember = initialMembers.find((m) => m.id === DEMO_MEMBER_ID)!;
  const [member, setMember] = React.useState<Member>(() =>
    user
      ? { ...baseMember, name: `${user.firstName} ${user.lastName}`, initials: toInitials(user.firstName, user.lastName), email: user.email, phone: user.phone ?? baseMember.phone }
      : baseMember,
  );
  const [paymentHistory, setPaymentHistory] = React.useState<Payment[]>(() =>
    initialPayments.filter((p) => p.memberName === baseMember.name)
  );

  const daysLeft = daysBetween(TODAY, member.expiresOn);
  const isExpiringSoon = daysLeft <= 14 && member.status !== "cancelled";
  const membershipBlock = getMembershipBlock(member.status);

  function purchaseMembership({ planId, method, priceOverride }: PurchaseInput): PurchaseResult {
    const targetPlan = getPlanById(planId);
    if (!targetPlan) throw new Error("Unknown plan");

    const amount = priceOverride ?? targetPlan.price;

    if (method === "Bank Transfer") {
      const invoiceId = `INV-${10300 + paymentHistory.length}`;
      const pendingPayment: Payment = {
        id: `p-${Date.now()}`,
        memberName: member.name,
        memberInitials: member.initials,
        amount,
        method,
        status: "pending",
        plan: targetPlan.name,
        category: "Membership",
        date: TODAY,
        invoiceId,
      };
      setPaymentHistory((prev) => [pendingPayment, ...prev]);
      toast.success("Payment pending", {
        description: "Bank transfers usually clear within 1–3 business days. We'll confirm once it's received.",
      });
      return { outcome: "pending" };
    }

    const newExpiry = computeNextExpiry(member.expiresOn, TODAY, targetPlan.billingPeriod);
    const invoiceId = `INV-${10300 + paymentHistory.length}`;
    const paidPayment: Payment = {
      id: `p-${Date.now()}`,
      memberName: member.name,
      memberInitials: member.initials,
      amount,
      method,
      status: "paid",
      plan: targetPlan.name,
      category: "Membership",
      date: TODAY,
      invoiceId,
    };
    setPaymentHistory((prev) => [paidPayment, ...prev]);
    setMember((prev) => ({
      ...prev,
      plan: targetPlan.name,
      status: "active",
      expiresOn: newExpiry,
      paymentStatus: "paid",
    }));
    toast.success("Payment successful!", {
      description: `Your ${targetPlan.name} membership is active until ${formatDate(newExpiry)}.`,
    });
    return { outcome: "success", newExpiry };
  }

  function toggleAutoRenew() {
    setMember((prev) => {
      const next = !prev.autoRenew;
      toast.success(next ? "Auto-renew turned on" : "Auto-renew turned off", {
        description: next
          ? "We'll automatically charge your payment method on file when your plan renews."
          : "You'll need to renew manually before your membership expires.",
      });
      return { ...prev, autoRenew: next };
    });
  }

  const value: MembershipContextValue = {
    member,
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
