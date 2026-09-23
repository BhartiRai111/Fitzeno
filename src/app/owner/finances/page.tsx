import { Suspense } from "react";
import { FinancesPageClient } from "./page-client";

export default function OwnerFinancesPage() {
  return (
    <Suspense>
      <FinancesPageClient />
    </Suspense>
  );
}
