import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export const metadata: Metadata = {
  title: {
    absolute: "Fitzeno — Strength & Conditioning Gym in Manchester",
    template: "%s · Fitzeno",
  },
  description:
    "Fitzeno is an independent strength and conditioning gym in Manchester's Riverside district — real coaching, small classes, and a community that shows up. Book a free trial today.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
