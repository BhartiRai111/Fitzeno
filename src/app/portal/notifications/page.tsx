"use client";

import * as React from "react";
import { Bell, BellOff, CalendarCheck, CreditCard, AlertTriangle, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { memberNotifications } from "@/lib/data/notifications";
import type { NotificationItem } from "@/lib/data/types";

const iconMap: Record<NotificationItem["type"], typeof Bell> = {
  booking: CalendarCheck,
  payment: CreditCard,
  alert: AlertTriangle,
  renewal: AlertTriangle,
  lead: Bell,
  system: Sparkles,
};

export default function PortalNotificationsPage() {
  const [notifications, setNotifications] = React.useState(memberNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Everything about your bookings, payments, and membership in one place."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="You're all caught up" description="New notifications will show up here." />
      ) : (
        <Card className="divide-y divide-border p-0">
          {notifications.map((n) => {
            const Icon = iconMap[n.type];
            return (
              <div
                key={n.id}
                className={cn("flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40", !n.read && "bg-accent/30")}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">{n.timestamp}</p>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
