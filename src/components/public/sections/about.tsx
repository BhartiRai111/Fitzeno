import { CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { gymProfile } from "@/lib/data/gym";

const values = [
  "Every member gets a real coach, not just a scanner at the door.",
  "Programming is written by our coaches, not copied from a template.",
  "Small class sizes so trainers can actually correct your form.",
];

export function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="About Fitzeno"
            title="Built by coaches who got tired of gyms that don't coach."
            description={`Founded in ${gymProfile.foundedYear}, Fitzeno started as a single strength floor and a promise: every member trains with a plan, not a guess.`}
          />
          <ul className="mt-6 space-y-3">
            {values.map((value) => (
              <li key={value} className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                {value}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-square rounded-xl bg-gradient-to-br from-brand-indigo-100 to-brand-indigo-300 dark:from-brand-indigo-900 dark:to-brand-indigo-700" />
          <div className="aspect-square translate-y-6 rounded-xl bg-gradient-to-br from-brand-lime-400/60 to-brand-lime-500/40" />
          <div className="aspect-square rounded-xl bg-muted" />
          <div className="aspect-square translate-y-6 rounded-xl bg-gradient-to-br from-brand-indigo-300 to-brand-indigo-500" />
        </div>
      </div>
    </section>
  );
}
