import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { ClassCard } from "@/components/public/class-card";
import { Button } from "@/components/ui/button";
import { gymClasses } from "@/lib/data/classes";

export function ClassesTeaser() {
  const featured = gymClasses.slice(0, 3);

  return (
    <section id="classes" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Classes"
        title="A packed weekly timetable."
        description="48 classes a week across strength, conditioning, yoga, and more — book in seconds from the member app."
        align="center"
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((gymClass) => (
          <ClassCard key={gymClass.id} gymClass={gymClass} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button variant="ghost" asChild>
          <Link href="/classes">
            View the full timetable
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
