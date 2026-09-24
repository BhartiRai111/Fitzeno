import { Suspense } from "react";
import { ReportsPageClient } from "./page-client";

export default function OwnerReportsPage() {
  return (
    <Suspense>
      <ReportsPageClient />
    </Suspense>
  );
}
