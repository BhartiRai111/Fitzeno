"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FreeTrialDialog } from "@/components/public/free-trial-dialog";

export function FinalCta() {
  const [trialOpen, setTrialOpen] = React.useState(false);

  return (
    <section className="relative overflow-hidden bg-neutral-950">
      <div className="absolute inset-0 bg-hero-gradient opacity-60" />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to train with a plan, not a guess?
        </h2>
        <p className="mt-4 text-base text-white/70">
          Book a free trial today — no card required, no pressure. Just come see what coached
          training feels like.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" variant="accent" onClick={() => setTrialOpen(true)}>
            Book Free Trial
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
            asChild
          >
            <Link href="/register">Join Fitzeno Today</Link>
          </Button>
        </div>
      </div>
      <FreeTrialDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}
