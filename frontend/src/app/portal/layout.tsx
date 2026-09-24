"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { MemberBottomNav } from "@/components/dashboard/member-bottom-nav";
import { BookingsProvider } from "@/components/portal/bookings-provider";
import { MembershipProvider } from "@/components/portal/membership-provider";
import { RequireAuth } from "@/lib/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-context";
import { useOwnNotifications } from "@/hooks/use-notifications";
import { toInitials } from "@/lib/api/enum-maps";

function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { data: notifications } = useOwnNotifications();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role="member" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          role="member"
          roleLabel="Member"
          userName={user ? `${user.firstName} ${user.lastName}` : ""}
          userInitials={user ? toInitials(user.firstName, user.lastName) : ""}
          notifications={notifications?.items ?? []}
          searchPlaceholder="Search classes, trainers..."
          onLogout={logout}
        />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
        <MemberBottomNav />
      </div>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth portal="member">
      <MembershipProvider>
        <BookingsProvider>
          <PortalShell>{children}</PortalShell>
        </BookingsProvider>
      </MembershipProvider>
    </RequireAuth>
  );
}
