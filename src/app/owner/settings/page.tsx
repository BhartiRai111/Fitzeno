"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoMark } from "@/components/brand/logo-mark";
import { gymProfile } from "@/lib/data/gym";
import { staffMembers } from "@/lib/data/staff";
import { cn } from "@/lib/utils";

function SaveButton({ label = "Save Changes" }: { label?: string }) {
  const [saving, setSaving] = React.useState(false);
  return (
    <Button
      size="sm"
      loading={saving}
      onClick={(e) => {
        e.preventDefault();
        setSaving(true);
        setTimeout(() => {
          setSaving(false);
          toast.success("Settings saved");
        }, 600);
      }}
    >
      {label}
    </Button>
  );
}

export default function OwnerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [hours, setHours] = React.useState(gymProfile.hours);
  const [notifPrefs, setNotifPrefs] = React.useState({
    renewalReminders: true,
    inactivityAlerts: true,
    paymentFailedAlerts: true,
    newLeadAlerts: true,
    lowAttendanceAlerts: false,
  });
  const [memberChannels, setMemberChannels] = React.useState({
    booking: true,
    renewal: true,
    payment: true,
    attendance: true,
    announcement: true,
    promotion: true,
  });
  const [staffChannels, setStaffChannels] = React.useState({
    booking: true,
    class: true,
    attendance: true,
    announcement: true,
  });
  const [paymentMethods, setPaymentMethods] = React.useState({
    card: true,
    upi: true,
    cash: true,
    bankTransfer: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage how Fitzeno runs, day to day" />

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="profile">Gym Profile</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
          <TabsTrigger value="membership">Membership Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notification Settings</TabsTrigger>
          <TabsTrigger value="payments">Payment Settings</TabsTrigger>
          <TabsTrigger value="staff">Staff & Permissions</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Gym profile</CardTitle>
              <CardDescription>Shown on your public website and member app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-xl bg-primary">
                  <LogoMark className="size-9" />
                </div>
                <Button variant="outline" size="sm">Change Logo</Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gym-name">Gym name</Label>
                  <Input id="gym-name" defaultValue={gymProfile.name} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gym-tagline">Tagline</Label>
                  <Input id="gym-tagline" defaultValue={gymProfile.tagline} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gym-description">Description</Label>
                <Textarea id="gym-description" defaultValue={gymProfile.description} rows={3} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gym-phone">Phone</Label>
                  <Input id="gym-phone" defaultValue={gymProfile.phone} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gym-email">Email</Label>
                  <Input id="gym-email" type="email" defaultValue={gymProfile.email} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gym-address">Address</Label>
                <Input id="gym-address" defaultValue={gymProfile.address} />
              </div>
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General settings</CardTitle>
              <CardDescription>Regional and account-wide defaults.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select defaultValue="europe-london">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="europe-london">Europe/London (GMT+1)</SelectItem>
                    <SelectItem value="europe-paris">Europe/Paris (GMT+2)</SelectItem>
                    <SelectItem value="america-new_york">America/New York (GMT-4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select defaultValue="gbp">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gbp">£ GBP</SelectItem>
                    <SelectItem value="usd">$ USD</SelectItem>
                    <SelectItem value="eur">€ EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select defaultValue="en-gb">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-gb">English (UK)</SelectItem>
                    <SelectItem value="en-us">English (US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date format</Label>
                <Select defaultValue="dmy">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Business hours</CardTitle>
              <CardDescription>Shown on your public website and used for booking windows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hours.map((h, i) => (
                <div key={h.day} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-40 shrink-0 text-sm font-medium text-foreground">{h.day}</span>
                  <Input
                    value={h.time}
                    onChange={(e) => {
                      const next = [...hours];
                      next[i] = { ...next[i], time: e.target.value };
                      setHours(next);
                    }}
                    className="sm:max-w-xs"
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="membership">
          <Card>
            <CardHeader>
              <CardTitle>Membership settings</CardTitle>
              <CardDescription>Rules that apply across all membership plans.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="freeze-count">Freezes allowed per year</Label>
                <Input id="freeze-count" type="number" defaultValue={2} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="freeze-days">Max freeze duration (days)</Label>
                <Input id="freeze-days" type="number" defaultValue={30} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cancel-notice">Cancellation notice (days)</Label>
                <Input id="cancel-notice" type="number" defaultValue={0} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label>Renewal reminders sent</Label>
                <Select defaultValue="14-7-1">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14-7-1">14, 7, and 1 days before</SelectItem>
                    <SelectItem value="7-1">7 and 1 days before</SelectItem>
                    <SelectItem value="1">1 day before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your alerts</CardTitle>
              <CardDescription>Choose which automated alerts stay active for your own inbox.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {(
                [
                  { key: "renewalReminders" as const, label: "Renewal reminders", description: "Notify members before their membership renews or expires." },
                  { key: "inactivityAlerts" as const, label: "Inactivity alerts", description: "Alert staff when members haven't checked in for 14+ days." },
                  { key: "paymentFailedAlerts" as const, label: "Payment failed alerts", description: "Notify staff immediately when a payment fails." },
                  { key: "newLeadAlerts" as const, label: "New lead alerts", description: "Notify the front desk when a new enquiry comes in." },
                  { key: "lowAttendanceAlerts" as const, label: "Low class attendance alerts", description: "Flag classes trending below 50% capacity." },
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
                      checked={notifPrefs[item.key]}
                      onCheckedChange={(checked) => setNotifPrefs((prev) => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                </React.Fragment>
              ))}
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member communication controls</CardTitle>
              <CardDescription>
                Turn off a category to stop sending it to members platform-wide — members can only fine-tune categories you&apos;ve left on.
                Members only ever see notifications about their own bookings, membership, and payments — never another member&apos;s information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {(
                [
                  { key: "booking" as const, label: "Booking & waitlist updates", description: "Confirmations, cancellations, and waitlist spots opening up." },
                  { key: "renewal" as const, label: "Renewal reminders", description: "Upcoming membership expiry and renewal charges." },
                  { key: "payment" as const, label: "Payment receipts & failures", description: "Receipts, failed payments, and refund confirmations." },
                  { key: "attendance" as const, label: "Attendance & streaks", description: "Check-in streaks and progress milestones." },
                  { key: "announcement" as const, label: "Gym announcements", description: "Closures, schedule changes, and general updates." },
                  { key: "promotion" as const, label: "Offers & promotions", description: "Referral bonuses and seasonal offers." },
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
                      checked={memberChannels[item.key]}
                      onCheckedChange={(checked) => setMemberChannels((prev) => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                </React.Fragment>
              ))}
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trainer & staff communication controls</CardTitle>
              <CardDescription>
                Choose which categories reach trainers and front desk staff. Each trainer only ever sees updates about their own classes and assigned members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {(
                [
                  { key: "booking" as const, label: "New PT bookings & cancellations", description: "Session bookings and cancellations for their own clients." },
                  { key: "class" as const, label: "Class capacity & schedule alerts", description: "Classes nearing capacity, cancellations, and roster changes." },
                  { key: "attendance" as const, label: "Attendance marking reminders", description: "Nudges to mark attendance for classes still open." },
                  { key: "announcement" as const, label: "Gym-wide announcements", description: "Closures, policy updates, and general communication." },
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
                      checked={staffChannels[item.key]}
                      onCheckedChange={(checked) => setStaffChannels((prev) => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                </React.Fragment>
              ))}
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment settings</CardTitle>
              <CardDescription>Accepted payment methods and billing behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {(
                [
                  { key: "card" as const, label: "Card payments" },
                  { key: "upi" as const, label: "UPI" },
                  { key: "cash" as const, label: "Cash (in person)" },
                  { key: "bankTransfer" as const, label: "Bank transfer" },
                ]
              ).map((item, i) => (
                <React.Fragment key={item.key}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between py-3">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <Switch
                      checked={paymentMethods[item.key]}
                      onCheckedChange={(checked) => setPaymentMethods((prev) => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                </React.Fragment>
              ))}
            </CardContent>
            <CardFooter><SaveButton /></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff & permissions</CardTitle>
              <CardDescription>What each role can see and do. Manage people from Trainers & Staff.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Manager", "Front Desk", "Front Desk / Sales"].map((role) => {
                const count = staffMembers.filter((s) => s.role === role).length;
                const perms = staffMembers.find((s) => s.role === role)?.permissions ?? [];
                return (
                  <div key={role} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{role}</span>
                      <Badge variant="outline">{count} {count === 1 ? "person" : "people"}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map((p) => (
                        <Badge key={p} variant="default">{p}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Theme preference for your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-md border p-4 transition-colors",
                      theme === opt.value ? "border-primary bg-accent" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <opt.icon className="size-5 text-foreground" />
                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Brand colors</p>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="size-10 rounded-md bg-primary" />
                    <span className="text-xs text-muted-foreground">Primary</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="size-10 rounded-md bg-brand-lime" />
                    <span className="text-xs text-muted-foreground">Accent</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
