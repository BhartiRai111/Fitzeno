"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function PortalProfilePage() {
  const [saving, setSaving] = React.useState(false);
  const [prefs, setPrefs] = React.useState({
    bookings: true,
    renewalReminders: true,
    payments: true,
    attendance: true,
    announcements: true,
    promotions: false,
  });

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated");
    }, 700);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile & Settings" description="Manage your personal details and notification preferences." />

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>This is shown to trainers and front desk staff.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="text-lg">AP</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm">
                Change photo
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" defaultValue="Aisha Patel" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue="+44 7700 900123" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" defaultValue="aisha.patel@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency">Emergency contact</Label>
              <Input id="emergency" defaultValue="Rohan Patel · +44 7700 900999" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>Choose what you want to be notified about. Your gym may keep some categories on by default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {(
            [
              { key: "bookings" as const, label: "Bookings & waitlist", description: "Confirmations, cancellations, and waitlist spots opening up." },
              { key: "renewalReminders" as const, label: "Renewal reminders", description: "Get notified before your membership renews or expires." },
              { key: "payments" as const, label: "Payment receipts & failures", description: "Receipts, failed payments, and refund confirmations." },
              { key: "attendance" as const, label: "Attendance & streaks", description: "Check-in streaks and progress milestones." },
              { key: "announcements" as const, label: "Gym announcements", description: "Closures, schedule changes, and general updates from Fitzeno." },
              { key: "promotions" as const, label: "Offers & promotions", description: "Get notified about discounts and referral offers." },
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
                  onCheckedChange={(checked) =>
                    setPrefs((prev) => ({ ...prev, [item.key]: checked }))
                  }
                />
              </div>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
