import { TrendingUp } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function PortalProgressPage() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="Progress Tracker"
      description="Log metrics, track personal records, and see your training trend over time."
    />
  );
}
