"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { NotificationCenter } from "@/components/dashboard/notifications/notification-center";
import {
  useOwnNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notifications";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { NotificationCategory, NotificationItem } from "@/lib/data/types";

export function TrainerNotificationsPageClient() {
  const { data, isLoading } = useOwnNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const [draft, setDraft] = React.useState<Partial<Record<NotificationCategory, boolean>>>({});
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleItemsChange(next: NotificationItem[]) {
    for (const n of next) {
      const prev = notifications.find((p) => p.id === n.id);
      if (prev && !prev.read && n.read) markRead.mutate(n.id);
    }
  }

  async function handleSavePrefs() {
    const changed = Object.entries(draft);
    if (changed.length === 0) return;
    setSavingPrefs(true);
    try {
      await updatePrefs.mutateAsync(changed.map(([category, enabled]) => ({ category: category as NotificationCategory, enabled: enabled! })));
      setDraft({});
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Couldn't save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Your own classes, PT sessions, and assigned members — other trainers' rosters stay private."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <NotificationCenter
        items={notifications}
        onItemsChange={handleItemsChange}
        loading={isLoading}
        emptyTitle="You're all caught up"
        emptyDescription="New bookings, class alerts, and attendance reminders will show up here."
      />

      {!prefsLoading && preferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notification preferences</CardTitle>
            <CardDescription>Choose what you want to be notified about.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {preferences.map((pref, i) => {
              const checked = draft[pref.category] ?? pref.enabled;
              return (
                <React.Fragment key={pref.category}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between py-3">
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <Switch
                      checked={checked}
                      disabled={!pref.toggleable}
                      onCheckedChange={(v) => setDraft((prev) => ({ ...prev, [pref.category]: v }))}
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </CardContent>
          <CardFooter>
            <Button size="sm" loading={savingPrefs} disabled={Object.keys(draft).length === 0} onClick={handleSavePrefs}>
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
