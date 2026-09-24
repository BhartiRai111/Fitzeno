import type { Metadata } from "next";
import { RegisterBusinessPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Set Up Your Gym",
};

export default function RegisterBusinessPage() {
  return <RegisterBusinessPageClient />;
}
