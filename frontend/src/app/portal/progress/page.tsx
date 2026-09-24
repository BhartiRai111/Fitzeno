"use client";

import * as React from "react";
import { Flame, CalendarCheck2, Dumbbell, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { attendanceRecords } from "@/lib/data/attendance";
import { getMemberRecords, getCurrentStreak, getVisitsInMonth, DEMO_MEMBER_ID, TODAY } from "@/lib/attendance-helpers";
import { useMembership } from "@/components/portal/membership-provider";
import { useBookings } from "@/components/portal/bookings-provider";
import { formatDate, daysBetween } from "@/lib/utils-data";

export default function PortalProgressPage() {
  const { member } = useMembership();
  const { myClassBookings } = useBookings();

  const records = getMemberRecords(attendanceRecords, DEMO_MEMBER_ID);
  const streak = getCurrentStreak(attendanceRecords, DEMO_MEMBER_ID);
  const visitsThisMonth = getVisitsInMonth(attendanceRecords, DEMO_MEMBER_ID);
  const totalVisits = records.length;
  const monthsAsMember = Math.max(1, Math.round(daysBetween(member.joinedOn, TODAY) / 30));

  const attendedBookings = myClassBookings.filter((b) => b.booking.status === "attended");
  const typeCounts = new Map<string, number>();
  for (const b of attendedBookings) {
    typeCounts.set(b.gymClass.type, (typeCounts.get(b.gymClass.type) ?? 0) + 1);
  }
  const favoriteTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const maxTypeCount = favoriteTypes[0]?.[1] ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" description="Your training consistency and class history at a glance." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} icon={Flame} />
        <StatCard label="Visits this month" value={String(visitsThisMonth)} icon={CalendarCheck2} />
        <StatCard label="Total check-ins" value={String(totalVisits)} icon={Dumbbell} />
        <StatCard label="Member for" value={`${monthsAsMember} mo`} icon={Trophy} helpText={`Since ${formatDate(member.joinedOn)}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Favorite class types</CardTitle>
            <CardDescription>Based on classes you&apos;ve attended</CardDescription>
          </CardHeader>
          <CardContent>
            {favoriteTypes.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No classes attended yet"
                description="Book and attend a class to start building your training history."
              />
            ) : (
              <div className="space-y-4">
                {favoriteTypes.map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{type}</span>
                      <span className="text-muted-foreground">
                        {count} {count === 1 ? "class" : "classes"}
                      </span>
                    </div>
                    <Progress value={maxTypeCount > 0 ? (count / maxTypeCount) * 100 : 0} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>Your last few visits to the gym</CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title="No check-ins yet"
                description="Check in at the gym to start your streak."
              />
            ) : (
              <div className="space-y-1">
                {records.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
                    <p className="text-sm font-medium text-foreground">{formatDate(r.date)}</p>
                    <p className="text-xs text-muted-foreground">{r.checkInTime}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
