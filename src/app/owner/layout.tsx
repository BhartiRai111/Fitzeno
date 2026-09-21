import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { ownerNotifications } from "@/lib/data/notifications";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role="owner" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          role="owner"
          roleLabel="Gym Owner"
          userName="Sam Carter"
          userInitials="SC"
          notifications={ownerNotifications}
          searchPlaceholder="Search members, leads, payments..."
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
