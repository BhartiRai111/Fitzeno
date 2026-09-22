import { Suspense } from "react";
import { MembershipPageClient } from "./page-client";

export default function PortalMembershipPage() {
  return (
    <Suspense>
      <MembershipPageClient />
    </Suspense>
  );
}
