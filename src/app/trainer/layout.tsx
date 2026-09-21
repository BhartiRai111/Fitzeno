import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { trainerNotifications } from "@/lib/data/notifications";

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role="trainer" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          role="trainer"
          roleLabel="Head Strength Coach"
          userName="Maya Okonkwo"
          userInitials="MO"
          notifications={trainerNotifications}
          searchPlaceholder="Search members, sessions..."
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
