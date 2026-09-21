import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function PortalMembershipPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Membership"
      description="View your plan details, renewal date, payment history, and upgrade options."
    />
  );
}
