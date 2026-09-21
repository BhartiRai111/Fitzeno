import { UserPlus } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerLeadsPage() {
  return (
    <ComingSoon
      icon={UserPlus}
      title="Leads & Enquiries"
      description="Track every enquiry from first contact through trial to conversion."
    />
  );
}
