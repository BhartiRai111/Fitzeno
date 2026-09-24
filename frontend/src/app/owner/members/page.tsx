import { Suspense } from "react";
import { MembersPageClient } from "./page-client";

export default function OwnerMembersPage() {
  return (
    <Suspense>
      <MembersPageClient />
    </Suspense>
  );
}
