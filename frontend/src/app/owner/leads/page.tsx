import { Suspense } from "react";
import { LeadsPageClient } from "./page-client";

export default function OwnerLeadsPage() {
  return (
    <Suspense>
      <LeadsPageClient />
    </Suspense>
  );
}
