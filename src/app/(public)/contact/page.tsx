import type { Metadata } from "next";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Fitzeno — ask a question about membership, drop by during opening hours, or send us a message and we'll reply within 24 hours.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contact"
        title="Come see the club for yourself."
        description="Have a question before you join? Send us a message or drop by during opening hours."
        align="center"
      />
      <div className="mt-12">
        <ContactPageClient />
      </div>
    </div>
  );
}
