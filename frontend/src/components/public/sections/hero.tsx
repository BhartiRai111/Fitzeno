"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FreeTrialDialog } from "@/components/public/free-trial-dialog";
import { gymProfile } from "@/lib/data/gym";

export function Hero() {
  const [trialOpen, setTrialOpen] = React.useState(false);

  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <div className="absolute inset-0 bg-grid-fade opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-28 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-elevation-xs">
              <Star className="size-3.5 fill-brand-lime text-brand-lime" />
              Rated 4.9 by {gymProfile.memberCount}+ members
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Train with purpose.
              <br />
              <span className="text-primary">Coached, not guessed.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {gymProfile.description} Book a free trial and feel the difference honest
              coaching makes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => setTrialOpen(true)}>
                Book Free Trial
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">
                  Join Now
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["AP", "TB", "LF", "CO"].map((initials) => (
                  <Avatar key={initials} className="size-9 border-2 border-background">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Join <span className="font-semibold text-foreground">{gymProfile.memberCount}+</span>{" "}
                members already training with us
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-elevation-lg">
              <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 rounded-xl bg-gradient-to-br from-primary via-primary to-brand-indigo-700 text-primary-foreground sm:aspect-[5/4] lg:aspect-[4/5]">
                <button
                  type="button"
                  className="group flex size-16 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-transform hover:scale-105"
                  aria-label="Play gym tour video"
                >
                  <PlayCircle className="size-9" />
                </button>
                <p className="px-8 text-center text-sm text-white/80">
                  Take a 60-second tour of the Riverside club
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-card p-4 shadow-elevation-lg sm:block">
              <p className="font-display text-2xl font-bold tabular text-foreground">6 yrs</p>
              <p className="text-xs text-muted-foreground">running strong in Manchester</p>
            </div>
          </div>
        </div>
      </div>
      <FreeTrialDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}
