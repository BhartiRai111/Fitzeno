import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { MemberBottomNav } from "@/components/dashboard/member-bottom-nav";
import { BookingsProvider } from "@/components/portal/bookings-provider";
import { memberNotifications } from "@/lib/data/notifications";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingsProvider>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="member" />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar
            role="member"
            roleLabel="Member · Growth Plan"
            userName="Aisha Patel"
            userInitials="AP"
            notifications={memberNotifications}
            searchPlaceholder="Search classes, trainers..."
          />
          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
          <MemberBottomNav />
        </div>
      </div>
    </BookingsProvider>
  );
}
