import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function OwnerSettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Gym Settings"
      description="Branding, hours, location, staff roles, and notification preferences."
    />
  );
}
