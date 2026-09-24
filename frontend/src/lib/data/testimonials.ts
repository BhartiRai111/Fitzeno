import type { Testimonial, FaqItem, Offer } from "./types";

export const testimonials: Testimonial[] = [
  {
    id: "t-1",
    name: "Aisha Patel",
    initials: "AP",
    memberSince: "Member since 2022",
    rating: 5,
    quote:
      "The coaching quality is what keeps me here. Every trainer actually watches your form and adjusts the plan — it doesn't feel like a generic gym.",
  },
  {
    id: "t-2",
    name: "Tom Bradley",
    initials: "TB",
    memberSince: "Member since 2021",
    rating: 5,
    quote:
      "Booking classes through the app takes ten seconds and I've never once shown up to a full class without knowing beforehand. Small thing, but it matters.",
  },
  {
    id: "t-3",
    name: "Lena Fischer",
    initials: "LF",
    memberSince: "Member since 2023",
    rating: 5,
    quote:
      "I joined for a free trial and ended up staying for the community. The check-in streak feature is oddly motivating — I'm at 74 days now.",
  },
  {
    id: "t-4",
    name: "Chidi Okafor",
    initials: "CO",
    memberSince: "Member since 2020",
    rating: 4,
    quote:
      "Four years in and the strength floor is still my favorite part of my day. Renewal reminders mean I've never had a lapse in membership.",
  },
];

export const faqs: FaqItem[] = [
  {
    id: "faq-1",
    category: "Membership",
    question: "Can I pause my membership if I travel often?",
    answer:
      "Yes. Every plan supports up to two membership freezes per year, each lasting up to 30 days, managed directly from your member dashboard.",
  },
  {
    id: "faq-2",
    category: "Membership",
    question: "What happens if I want to cancel?",
    answer:
      "You can cancel any time from your account settings. Your access continues until the end of your current billing period — no early termination fees.",
  },
  {
    id: "faq-3",
    category: "Classes",
    question: "How far in advance can I book a class?",
    answer:
      "Basic members can book up to 48 hours ahead. Growth and Elite members get 24-hour priority booking windows before classes open to everyone else.",
  },
  {
    id: "faq-4",
    category: "Classes",
    question: "What if a class is full?",
    answer:
      "You can join the waitlist with one tap. If a spot opens up, you're automatically promoted and notified immediately.",
  },
  {
    id: "faq-5",
    category: "Payments",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major cards, UPI, and bank transfers. Payments can also be made in person at the front desk.",
  },
  {
    id: "faq-6",
    category: "Trial",
    question: "Is the free trial really free?",
    answer:
      "Yes — no card required. Book a session, come try the gym and a class, and decide afterward whether to join.",
  },
  {
    id: "faq-7",
    category: "General",
    question: "Do you offer personal training for beginners?",
    answer:
      "Absolutely. Our Elite plan includes monthly PT sessions, and additional sessions can be booked à la carte on any plan.",
  },
];

export const offers: Offer[] = [
  {
    id: "offer-1",
    title: "New Member Kickstart",
    code: "KICKSTART20",
    description: "Get 20% off your first three months on the Growth or Elite plan.",
    discount: "20% off",
    validUntil: "2026-10-31",
    applicablePlans: ["plan-growth", "plan-elite"],
  },
  {
    id: "offer-2",
    title: "Refer a Friend",
    code: "FRIENDFIT",
    description: "Refer a friend who joins and you both get a free month.",
    discount: "1 month free",
    validUntil: "2026-12-31",
    applicablePlans: ["plan-basic", "plan-growth", "plan-elite"],
  },
];
