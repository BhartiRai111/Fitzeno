import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerReportsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Reports & Analytics"
      description="Revenue, retention, class performance, and attendance trend reports."
    />
  );
}
