"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { NotificationCenter } from "@/components/dashboard/notifications/notification-center";
import { trainerNotifications } from "@/lib/data/notifications";
import type { NotificationItem } from "@/lib/data/types";

export function TrainerNotificationsPageClient() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(trainerNotifications);
  const [prefs, setPrefs] = React.useState({
    bookings: true,
    classAlerts: true,
    attendanceReminders: true,
    announcements: true,
  });
  const [savingPrefs, setSavingPrefs] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleSavePrefs() {
    setSavingPrefs(true);
    setTimeout(() => {
      setSavingPrefs(false);
      toast.success("Preferences saved");
    }, 600);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Your own classes, PT sessions, and assigned members — other trainers' rosters stay private."
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

      <NotificationCenter
        items={notifications}
        onItemsChange={setNotifications}
        emptyTitle="You're all caught up"
        emptyDescription="New bookings, class alerts, and attendance reminders will show up here."
      />

      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>Choose what you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {(
            [
              { key: "bookings" as const, label: "PT bookings & cancellations", description: "New sessions, cancellations, and confirmations from your clients." },
              { key: "classAlerts" as const, label: "Class capacity & schedule alerts", description: "Your classes nearing capacity, or changes to your schedule." },
              { key: "attendanceReminders" as const, label: "Attendance marking reminders", description: "Nudges when a class you taught still needs attendance marked." },
              { key: "announcements" as const, label: "Gym announcements", description: "Closures, policy updates, and general communication from the gym." },
            ]
          ).map((item, i) => (
            <React.Fragment key={item.key}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, [item.key]: checked }))}
                />
              </div>
            </React.Fragment>
          ))}
        </CardContent>
        <CardFooter>
          <Button size="sm" loading={savingPrefs} onClick={handleSavePrefs}>
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
