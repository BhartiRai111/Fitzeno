import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerClassesPage() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Classes & Schedule"
      description="Build the weekly timetable, assign trainers, and manage capacity and waitlists."
    />
  );
}
