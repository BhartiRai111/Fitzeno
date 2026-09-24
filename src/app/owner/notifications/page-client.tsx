"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationCenter } from "@/components/dashboard/notifications/notification-center";
import { SendNotificationDialog } from "@/components/dashboard/dialogs/send-notification-dialog";
import { useOwnNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-notifications";
import { useAnnouncements } from "@/hooks/use-announcements";
import { formatDate } from "@/lib/utils-data";
import type { NotificationItem } from "@/lib/data/types";

type TabValue = "inbox" | "sent";

export function OwnerNotificationsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "inbox";
  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const { data, isLoading } = useOwnNotifications();
  const { announcements } = useAnnouncements();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleItemsChange(next: NotificationItem[]) {
    for (const n of next) {
      const prev = notifications.find((p) => p.id === n.id);
      if (prev && !prev.read && n.read) markRead.mutate(n.id);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Gym-wide alerts — leads, payments, renewals, attendance, classes, and staff updates."
        actions={
          <>
            {tab === "inbox" && unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
                Mark all as read
              </Button>
            )}
            <SendNotificationDialog />
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          <TabsTrigger value="sent">Sent Announcements ({announcements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <NotificationCenter
            items={notifications}
            onItemsChange={handleItemsChange}
            loading={isLoading}
            emptyTitle="You're all caught up"
            emptyDescription="Leads, payments, renewals, and operational alerts will show up here."
          />
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements sent yet"
              description="Broadcast updates, offers, or schedule changes to members, trainers, or staff."
            />
          ) : (
            <Card className="divide-y divide-border p-0">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Megaphone className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      {a.priority === "high" && <Badge variant="danger">Important</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{a.message}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground/70">
                      Sent by {a.sentBy} · {formatDate(a.sentOn)} · {a.audienceLabel} · ~{a.recipientCount.toLocaleString()} recipients
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
