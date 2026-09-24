import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageClient />
    </Suspense>
  );
}
