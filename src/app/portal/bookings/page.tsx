import { CalendarCheck } from "lucide-react";
import { ComingSoon } from "@/components/shared/coming-soon";

export default function PortalBookingsPage() {
  return (
    <ComingSoon
      icon={CalendarCheck}
      title="My Bookings"
      description="Manage your upcoming class and personal training bookings, plus your waitlist spots."
    />
  );
}
