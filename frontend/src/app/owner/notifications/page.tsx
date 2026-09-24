import { Suspense } from "react";
import { OwnerNotificationsPageClient } from "./page-client";

export default function OwnerNotificationsPage() {
  return (
    <Suspense>
      <OwnerNotificationsPageClient />
    </Suspense>
  );
}
