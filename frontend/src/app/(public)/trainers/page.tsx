import type { Metadata } from "next";
import { SectionHeading } from "@/components/shared/section-heading";
import { TrainersPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Trainers",
};

export default function TrainersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Our Coaches"
        title="Meet the team behind your progress."
        description="Every coach at Fitzeno is certified and specializes in coaching real people, not just running classes."
        align="center"
      />
      <div className="mt-10">
        <TrainersPageClient />
      </div>
    </div>
  );
}
