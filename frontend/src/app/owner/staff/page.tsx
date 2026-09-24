import { Suspense } from "react";
import { StaffPageClient } from "./page-client";

export default function OwnerStaffPage() {
  return (
    <Suspense>
      <StaffPageClient />
    </Suspense>
  );
}
