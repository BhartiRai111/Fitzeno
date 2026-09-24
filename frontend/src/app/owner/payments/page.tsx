import { Suspense } from "react";
import { PaymentsPageClient } from "./page-client";

export default function OwnerPaymentsPage() {
  return (
    <Suspense>
      <PaymentsPageClient />
    </Suspense>
  );
}
