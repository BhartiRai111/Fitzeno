import { ClipboardCheck } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerAttendancePage() {
  return (
    <ComingSoon
      icon={ClipboardCheck}
      title="Attendance"
      description="Live check-in feed and historical attendance logs across the gym."
    />
  );
}
