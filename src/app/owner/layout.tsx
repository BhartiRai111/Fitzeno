"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { RequireAuth } from "@/lib/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-context";
import { useOwnNotifications } from "@/hooks/use-notifications";
import { toInitials } from "@/lib/api/enum-maps";
import { ROLE_LABELS } from "@/lib/permissions";

function OwnerShell({ children }: { children: React.ReactNode }) {
  const { user, staffRole, logout } = useAuth();
  const { data: notifications } = useOwnNotifications();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role="owner" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          role="owner"
          roleLabel={staffRole ? ROLE_LABELS[staffRole] : "Staff"}
          userName={user ? `${user.firstName} ${user.lastName}` : ""}
          userInitials={user ? toInitials(user.firstName, user.lastName) : ""}
          notifications={notifications?.items ?? []}
          searchPlaceholder="Search members, leads, payments..."
          onLogout={logout}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth portal="owner">
      <OwnerShell>{children}</OwnerShell>
    </RequireAuth>
  );
}
