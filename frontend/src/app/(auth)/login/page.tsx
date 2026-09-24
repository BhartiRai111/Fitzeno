import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Log In",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
