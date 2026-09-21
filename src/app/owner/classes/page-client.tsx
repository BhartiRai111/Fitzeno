"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarX2, ListX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { CapacityBar } from "@/components/shared/capacity-bar";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { ClassDialog } from "@/components/dashboard/dialogs/class-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { gymClasses } from "@/lib/data/classes";
import { classBookings } from "@/lib/data/class-bookings";
import { trainers } from "@/lib/data/trainers";
import { formatDate } from "@/lib/utils-data";

type TabValue = "calendar" | "classes" | "bookings" | "waitlist";

export function ClassesPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "calendar";
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  const waitlisted = classBookings.filter((b) => b.status === "waitlisted");
  const waitlistByClass = gymClasses
    .map((c) => ({ gymClass: c, entries: waitlisted.filter((w) => w.classId === c.id) }))
    .filter((g) => g.entries.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Schedule"
        description={`${gymClasses.length} classes running weekly`}
        actions={<ClassDialog />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist ({waitlistByClass.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card className="p-4 sm:p-5">
            <WeekCalendar classes={gymClasses} />
          </Card>
        </TabsContent>

        <TabsContent value="classes">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Trainer</th>
                    <th className="px-4 py-3 font-medium">Day</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Capacity</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {gymClasses.map((gymClass) => {
                    const trainer = trainers.find((t) => t.id === gymClass.trainerId);
                    return (
                      <tr key={gymClass.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{gymClass.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{trainer?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{gymClass.day}</td>
                        <td className="px-4 py-3 text-muted-foreground">{gymClass.startTime}</td>
                        <td className="px-4 py-3 text-muted-foreground">{gymClass.location}</td>
                        <td className="px-4 py-3">
                          <div className="w-32"><CapacityBar booked={gymClass.booked} capacity={gymClass.capacity} /></div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ClassDialog gymClass={gymClass} trigger={<Button size="sm" variant="ghost">Edit</Button>} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          {classBookings.length === 0 ? (
            <EmptyState icon={CalendarX2} title="No bookings yet" description="Class bookings will appear here." />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Class</th>
                      <th className="px-4 py-3 font-medium">Booked on</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classBookings.map((booking) => {
                      const gymClass = gymClasses.find((c) => c.id === booking.classId);
                      return (
                        <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                <AvatarFallback className="text-xs">{booking.memberInitials}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">{booking.memberName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{gymClass?.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(booking.bookedOn)}</td>
                          <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-4">
          {waitlistByClass.length === 0 ? (
            <EmptyState icon={ListX} title="No one on the waitlist" description="Classes without free spots will show their waitlist here." />
          ) : (
            waitlistByClass.map(({ gymClass, entries }) => (
              <Card key={gymClass.id}>
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">{gymClass.name}</p>
                    <p className="text-xs text-muted-foreground">{gymClass.day} · {gymClass.startTime} · {gymClass.booked}/{gymClass.capacity} booked</p>
                  </div>
                  <Badge variant="warning">{entries.length} waiting</Badge>
                </div>
                <div className="p-2">
                  {entries.map((entry, i) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center text-xs font-medium text-muted-foreground">{i + 1}</span>
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{entry.memberInitials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{entry.memberName}</span>
                      </div>
                      <ConfirmActionDialog
                        trigger={<Button size="sm" variant="outline">Promote to Booked</Button>}
                        title={`Promote ${entry.memberName}?`}
                        description={`They'll be moved from the waitlist into a confirmed spot for ${gymClass.name}.`}
                        confirmLabel="Promote"
                        onConfirm={() => toast.success(`${entry.memberName} promoted to booked`)}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
