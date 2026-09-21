import { Dumbbell, Wind, Flower2, HeartPulse, Lock, ParkingSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { gymProfile } from "@/lib/data/gym";

const icons: LucideIcon[] = [Dumbbell, Wind, Flower2, HeartPulse, Lock, ParkingSquare];

export function Facilities() {
  return (
    <section id="facilities" className="bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Facilities"
          title="Everything you need, nothing you don't."
          description="A gym built around training, not gimmicks — strength, conditioning, recovery, and a community that shows up."
          align="center"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gymProfile.facilities.map((facility, index) => {
            const Icon = icons[index % icons.length];
            return (
              <Card
                key={facility.id}
                className="p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevation-md"
              >
                <div className="flex size-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                  {facility.name}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{facility.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
