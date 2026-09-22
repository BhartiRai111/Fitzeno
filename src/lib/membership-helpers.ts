import { membershipPlans } from "@/lib/data/plans";
import type { MembershipPlan } from "@/lib/data/types";

export function getPlanByName(name: string): MembershipPlan | undefined {
  return membershipPlans.find((p) => p.name === name);
}

export function getPlanById(id: string): MembershipPlan | undefined {
  return membershipPlans.find((p) => p.id === id);
}

/** Adds N months to an ISO date, keeping the same day-of-month where possible. */
export function addMonths(dateISO: string, months: number): string {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

/**
 * Next expiry date for a renewal: extends from the current expiry if it's still
 * in the future (stacking on top of remaining time), otherwise starts fresh from today.
 */
export function computeNextExpiry(currentExpiry: string, today: string, billingPeriod: MembershipPlan["billingPeriod"]): string {
  const months = billingPeriod === "year" ? 12 : 1;
  const base = currentExpiry >= today ? currentExpiry : today;
  return addMonths(base, months);
}

export type RenewalUrgency = "expired" | "urgent" | "soon" | "ok";

export function getRenewalUrgency(daysLeft: number): RenewalUrgency {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "urgent";
  if (daysLeft <= 14) return "soon";
  return "ok";
}

export interface OfferApplication {
  code: string;
  title: string;
  description: string;
  /** Price to charge for the first billing cycle after the discount. */
  discountedPrice: number;
}

/** Very small offer-code parser for the mock checkout flow. */
export function applyOfferToPrice(price: number, discountLabel: string): number {
  const percentMatch = discountLabel.match(/(\d+)%/);
  if (percentMatch) {
    const pct = Number(percentMatch[1]);
    return Math.round(price * (1 - pct / 100));
  }
  if (/free/i.test(discountLabel)) return 0;
  return price;
}
