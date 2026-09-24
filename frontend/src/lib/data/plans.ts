import type { MembershipPlan } from "./types";

export const membershipPlans: MembershipPlan[] = [
  {
    id: "plan-basic",
    name: "Basic",
    price: 39,
    billingPeriod: "month",
    description: "Full gym floor access for members who train independently.",
    perks: [
      "Unlimited gym floor access",
      "Locker room & shower access",
      "1 free class credit per month",
      "Fitzeno app access & QR check-in",
    ],
  },
  {
    id: "plan-growth",
    name: "Growth",
    price: 69,
    billingPeriod: "month",
    description: "Our most popular plan — full access plus unlimited classes.",
    perks: [
      "Everything in Basic",
      "Unlimited group classes",
      "Priority class booking (24h early)",
      "1 personal training session / month",
      "Guest pass — 2 per month",
    ],
    popular: true,
  },
  {
    id: "plan-elite",
    name: "Elite",
    price: 119,
    billingPeriod: "month",
    description: "For members who want a fully coached experience.",
    perks: [
      "Everything in Growth",
      "4 personal training sessions / month",
      "Monthly progress check-in with a coach",
      "Nutrition coaching add-on included",
      "Unlimited guest passes",
    ],
  },
];

export interface PlanComparisonRow {
  feature: string;
  basic: boolean | string;
  growth: boolean | string;
  elite: boolean | string;
}

export const planComparisonRows: PlanComparisonRow[] = [
  { feature: "Gym floor access", basic: true, growth: true, elite: true },
  { feature: "Locker & shower access", basic: true, growth: true, elite: true },
  { feature: "Group classes", basic: "1 credit / mo", growth: "Unlimited", elite: "Unlimited" },
  { feature: "Priority class booking", basic: false, growth: true, elite: true },
  { feature: "Personal training sessions", basic: false, growth: "1 / mo", elite: "4 / mo" },
  { feature: "Guest passes", basic: false, growth: "2 / mo", elite: "Unlimited" },
  { feature: "Nutrition coaching", basic: false, growth: false, elite: true },
];
