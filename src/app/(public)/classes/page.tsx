import type { Metadata } from "next";
import { SectionHeading } from "@/components/shared/section-heading";
import { ClassesPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Classes",
};

export default function ClassesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Weekly Timetable"
        title="48 classes a week, something for every goal."
        description="Filter by day or class type to see what's coming up. Booking is done from the member app once you join."
        align="center"
      />
      <div className="mt-10">
        <ClassesPageClient />
      </div>
    </div>
  );
}
