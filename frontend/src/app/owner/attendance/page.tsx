import { Suspense } from "react";
import { AttendancePageClient } from "./page-client";

export default function OwnerAttendancePage() {
  return (
    <Suspense>
      <AttendancePageClient />
    </Suspense>
  );
}
