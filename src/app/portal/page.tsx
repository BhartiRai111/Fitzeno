import Link from "next/link";
import {
  CalendarCheck,
  QrCode,
  Dumbbell,
  Flame,
  TrendingUp,
  ArrowRight,
  Clock,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MembershipCard } from "@/components/portal/membership-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { upcomingBookings, memberNotifications } from "@/lib/data/notifications";
import { trainers } from "@/lib/data/trainers";
import { daysBetween } from "@/lib/utils-data";

const currentMember = {
  name: "Aisha Patel",
  planName: "Growth",
  expiresOn: "27 Sep 2026",
  expiresOnRaw: "2026-09-27",
};

const weeklyVisits = [3, 4, 2, 5, 4, 6, 3];

export default function MemberDashboardPage() {
  const daysLeft = daysBetween("2026-09-21", currentMember.expiresOnRaw);
  const isExpiringSoon = daysLeft <= 14;
  const favoriteTrainer = trainers[0];
  const maxVisits = Math.max(...weeklyVisits);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${currentMember.name.split(" ")[0]}`}
        description="Here's your training snapshot for this week."
      />

      {isExpiringSoon && (
        <Card className="flex flex-col gap-3 border-warning/30 bg-warning-tint p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your membership renews in {daysLeft} days
              </p>
              <p className="text-sm text-muted-foreground">
                Your Growth plan renews on {currentMember.expiresOn}. Update your payment method or renew early.
              </p>
            </div>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/portal/membership">Manage Renewal</Link>
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MembershipCard
          memberName={currentMember.name}
          planName={currentMember.planName}
          expiresOn={currentMember.expiresOn}
          daysLeft={daysLeft}
          className="lg:col-span-1"
        />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Next up</CardTitle>
            <CardDescription>Your upcoming bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Dumbbell className="size-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{booking.className}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    with {booking.trainerName} · {booking.date} · {booking.startTime}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/portal/bookings">
                View all bookings
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Book a Class", icon: CalendarCheck, href: "/portal/classes" },
          { label: "Check In", icon: QrCode, href: "/portal/check-in" },
          { label: "View Membership", icon: TrendingUp, href: "/portal/membership" },
          { label: "Book PT Session", icon: Dumbbell, href: "/portal/bookings" },
        ].map((action) => (
          <Button key={action.label} variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href={action.href}>
              <action.icon className="size-5 text-primary" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Attendance this week</CardTitle>
              <CardDescription>27 visits this month · 12-day streak</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
              <Flame className="size-4 text-brand-lime-500" />
              12
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              {weeklyVisits.map((visits, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end">
                    <div
                      className="w-full rounded-md bg-primary/80 transition-all"
                      style={{ height: `${(visits / maxVisits) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your coach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback>{favoriteTrainer.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{favoriteTrainer.name}</p>
                <p className="text-xs text-muted-foreground">{favoriteTrainer.role}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                Next session: Fri 09:00
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-4" />
                Strength Floor
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Book with {favoriteTrainer.name.split(" ")[0]}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress summary</CardTitle>
            <CardDescription>Your goals this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Class attendance goal</span>
                <span className="font-medium tabular text-muted-foreground">14 / 16</span>
              </div>
              <Progress value={87.5} className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Strength training sessions</span>
                <span className="font-medium tabular text-muted-foreground">8 / 10</span>
              </div>
              <Progress value={80} className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Squat personal record</span>
                <span className="font-medium tabular text-muted-foreground">+7.5kg this month</span>
              </div>
              <Progress value={100} indicatorClassName="bg-success" className="mt-2" />
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/progress">
                View full progress tracker
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Notifications</CardTitle>
            <Badge variant="primary">{memberNotifications.filter((n) => !n.read).length} new</Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            {memberNotifications.slice(0, 3).map((n) => (
              <div key={n.id} className="rounded-md px-2 py-2 transition-colors hover:bg-muted/40">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">{n.timestamp}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/portal/notifications">
                View all notifications
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
