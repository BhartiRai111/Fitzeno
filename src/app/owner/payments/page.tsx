import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerPaymentsPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Payments & Revenue"
      description="Full transaction ledger, refunds, and revenue breakdowns by plan and method."
    />
  );
}
