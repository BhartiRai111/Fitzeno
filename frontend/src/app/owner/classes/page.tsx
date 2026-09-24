import { Suspense } from "react";
import { ClassesPageClient } from "./page-client";

export default function OwnerClassesPage() {
  return (
    <Suspense>
      <ClassesPageClient />
    </Suspense>
  );
}
