import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageClient />
    </Suspense>
  );
}
