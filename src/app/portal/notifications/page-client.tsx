"use client";

import * as React from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/dashboard/notifications/notification-center";
import { memberNotifications } from "@/lib/data/notifications";
import type { NotificationItem } from "@/lib/data/types";

export function PortalNotificationsPageClient() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(memberNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Everything about your bookings, membership, and payments — just yours, never another member's."
        actions={
          <>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
              >
                Mark all as read
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/profile">
                <Settings2 className="size-4" />
                Preferences
              </Link>
            </Button>
          </>
        }
      />

      <NotificationCenter
        items={notifications}
        onItemsChange={setNotifications}
        emptyTitle="You're all caught up"
        emptyDescription="Booking confirmations, membership reminders, and updates will show up here."
      />
    </div>
  );
}
