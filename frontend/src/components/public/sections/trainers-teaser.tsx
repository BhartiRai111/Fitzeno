import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { TrainerCard } from "@/components/public/trainer-card";
import { Button } from "@/components/ui/button";
import { trainers } from "@/lib/data/trainers";

export function TrainersTeaser() {
  return (
    <section id="trainers" className="bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Our Coaches"
          title="Certified coaches who actually coach."
          description="Every trainer at Fitzeno is certified, experienced, and genuinely invested in your progress."
          align="center"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trainers.slice(0, 3).map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="ghost" asChild>
            <Link href="/trainers">
              Meet the full team
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
