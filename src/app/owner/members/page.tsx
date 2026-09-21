import { Users } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerMembersPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Members"
      description="Search, filter, and manage every member's profile, plan, and history."
    />
  );
}
