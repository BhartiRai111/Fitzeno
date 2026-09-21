import { UserCircle } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerStaffPage() {
  return (
    <ComingSoon
      icon={UserCircle}
      title="Trainers & Staff"
      description="Manage trainer profiles, roles, permissions, and class assignments."
    />
  );
}
