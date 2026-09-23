import { Suspense } from "react";
import { StorePageClient } from "./page-client";

export default function OwnerStorePage() {
  return (
    <Suspense>
      <StorePageClient />
    </Suspense>
  );
}
