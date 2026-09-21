"use client";

import * as React from "react";
import { Bell, BellOff, CreditCard, AlertTriangle, RefreshCcw, UserRoundPlus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { SendNotificationDialog } from "@/components/dashboard/dialogs/send-notification-dialog";
import { cn } from "@/lib/utils";
import { ownerNotifications } from "@/lib/data/notifications";
import type { NotificationItem } from "@/lib/data/types";

const iconMap: Record<NotificationItem["type"], { icon: typeof Bell; className: string }> = {
  payment: { icon: CreditCard, className: "bg-info-tint text-info" },
  booking: { icon: Sparkles, className: "bg-accent text-accent-foreground" },
  alert: { icon: AlertTriangle, className: "bg-danger-tint text-danger" },
  renewal: { icon: RefreshCcw, className: "bg-warning-tint text-warning" },
  lead: { icon: UserRoundPlus, className: "bg-success-tint text-success" },
  system: { icon: Sparkles, className: "bg-accent text-accent-foreground" },
};

export default function OwnerNotificationsPage() {
  const [notifications, setNotifications] = React.useState(ownerNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filterByType = (type: NotificationItem["type"] | "all") =>
    type === "all" ? notifications : notifications.filter((n) => n.type === type);

  function renderList(items: NotificationItem[]) {
    if (items.length === 0) {
      return <EmptyState icon={BellOff} title="You're all caught up" description="Nothing here right now." />;
    }
    return (
      <Card className="divide-y divide-border p-0">
        {items.map((n) => {
          const config = iconMap[n.type];
          const Icon = config.icon;
          return (
            <div
              key={n.id}
              className={cn("flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40", !n.read && "bg-accent/30")}
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", config.className)}>
                <Icon className="size-4" />
              </span>
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
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Payments, leads, alerts, and renewals across Fitzeno"
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
            <SendNotificationDialog />
          </>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="alert">Alerts</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="lead">Leads</TabsTrigger>
          <TabsTrigger value="renewal">Renewals</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderList(filterByType("all"))}</TabsContent>
        <TabsContent value="alert">{renderList(filterByType("alert"))}</TabsContent>
        <TabsContent value="payment">{renderList(filterByType("payment"))}</TabsContent>
        <TabsContent value="lead">{renderList(filterByType("lead"))}</TabsContent>
        <TabsContent value="renewal">{renderList(filterByType("renewal"))}</TabsContent>
      </Tabs>
    </div>
  );
}
