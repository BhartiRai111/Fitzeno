import { Suspense } from "react";
import { MembershipsPageClient } from "./page-client";

export default function OwnerMembershipsPage() {
  return (
    <Suspense>
      <MembershipsPageClient />
    </Suspense>
  );
}
