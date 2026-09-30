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
import { useClassSeriesRoster, useClassOccurrences } from "@/hooks/use-classes";
import { useClassBookingsRoster, useCancelClassBooking, usePromoteClassBooking } from "@/hooks/use-class-bookings";
import { toInitials } from "@/lib/api/enum-maps";
import { ApiError, NetworkError } from "@/lib/api/types";
import { trainers } from "@/lib/data/trainers";
import { formatDate } from "@/lib/utils-data";

type TabValue = "calendar" | "classes" | "bookings" | "waitlist";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof NetworkError ? err.message : fallback;
}

export function ClassesPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "calendar";
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekEndIso = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  }, []);
  const twoWeekEndIso = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13);
    return d.toISOString().slice(0, 10);
  }, []);

  const { series, classes: seriesAsClasses, isLoading: seriesLoading } = useClassSeriesRoster();
  const { classes: weekOccurrences } = useClassOccurrences({ from: todayIso, to: weekEndIso });
  const { classes: twoWeekOccurrences } = useClassOccurrences({ from: todayIso, to: twoWeekEndIso });
  const { raw: bookings, isLoading: bookingsLoading } = useClassBookingsRoster({ limit: 200 });

  const cancelBooking = useCancelClassBooking();
  const promoteBooking = usePromoteClassBooking();

  const classesWithCapacity = seriesAsClasses.map((c) => {
    const upcoming = weekOccurrences.find((o) => o.name === c.name && o.trainerId === c.trainerId && o.day === c.day);
    return upcoming ? { ...c, booked: upcoming.booked, capacity: upcoming.capacity } : c;
  });

  const waitlisted = bookings.filter((b) => b.status === "WAITLISTED");
  const waitlistByOccurrence = new Map<string, typeof waitlisted>();
  for (const w of waitlisted) {
    const list = waitlistByOccurrence.get(w.classOccurrence.id) ?? [];
    list.push(w);
    waitlistByOccurrence.set(w.classOccurrence.id, list);
  }

  function handleCancelBooking(id: string, memberName: string) {
    cancelBooking.mutate(id, {
      onSuccess: () => toast.success(`${memberName}'s booking cancelled`),
      onError: (err) => toast.error(errorMessage(err, "Couldn't cancel this booking. Please try again.")),
    });
  }

  function handlePromote(id: string, memberName: string) {
    promoteBooking.mutate(id, {
      onSuccess: () => toast.success(`${memberName} promoted to booked`),
      onError: (err) => toast.error(errorMessage(err, "Couldn't promote this booking. Please try again.")),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Schedule"
        description={`${series.length} classes running weekly`}
        actions={<ClassDialog />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist ({waitlistByOccurrence.size})</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card className="p-4 sm:p-5">
            <WeekCalendar classes={weekOccurrences} />
          </Card>
        </TabsContent>

        <TabsContent value="classes">
          {seriesLoading ? (
            <p className="text-sm text-muted-foreground">Loading classes…</p>
          ) : (
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
                    {classesWithCapacity.map((gymClass) => {
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
          )}
        </TabsContent>

        <TabsContent value="bookings">
          {bookingsLoading ? (
            <p className="text-sm text-muted-foreground">Loading bookings…</p>
          ) : bookings.length === 0 ? (
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
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                      const memberName = `${booking.member.firstName} ${booking.member.lastName}`;
                      return (
                        <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                <AvatarFallback className="text-xs">{toInitials(booking.member.firstName, booking.member.lastName)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">{memberName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{booking.classOccurrence.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(booking.bookedAt.slice(0, 10))}</td>
                          <td className="px-4 py-3">
                            <BookingStatusBadge
                              status={booking.status === "CONFIRMED" ? "booked" : booking.status === "WAITLISTED" ? "waitlisted" : booking.status === "ATTENDED" ? "attended" : booking.status === "NO_SHOW" ? "no-show" : "cancelled"}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(booking.status === "CONFIRMED" || booking.status === "WAITLISTED") && (
                              <ConfirmActionDialog
                                trigger={<Button size="sm" variant="ghost" className="text-destructive">Cancel</Button>}
                                title={`Cancel ${memberName}'s booking?`}
                                description={`They'll be removed from ${booking.classOccurrence.name} and notified.`}
                                confirmLabel="Cancel Booking"
                                destructive
                                onConfirm={() => handleCancelBooking(booking.id, memberName)}
                              />
                            )}
                          </td>
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
          {waitlistByOccurrence.size === 0 ? (
            <EmptyState icon={ListX} title="No one on the waitlist" description="Classes without free spots will show their waitlist here." />
          ) : (
            [...waitlistByOccurrence.entries()].map(([occurrenceId, entries]) => {
              const occurrence = twoWeekOccurrences.find((o) => o.id === occurrenceId);
              const summary = entries[0]!.classOccurrence;
              return (
                <Card key={occurrenceId}>
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{summary.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(summary.date.slice(0, 10))} · {summary.startTime}
                        {occurrence ? ` · ${occurrence.booked}/${occurrence.capacity} booked` : ""}
                      </p>
                    </div>
                    <Badge variant="warning">{entries.length} waiting</Badge>
                  </div>
                  <div className="p-2">
                    {entries.map((entry, i) => {
                      const memberName = `${entry.member.firstName} ${entry.member.lastName}`;
                      return (
                        <div key={entry.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-center text-xs font-medium text-muted-foreground">{i + 1}</span>
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">{toInitials(entry.member.firstName, entry.member.lastName)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">{memberName}</span>
                          </div>
                          <ConfirmActionDialog
                            trigger={<Button size="sm" variant="outline">Promote to Booked</Button>}
                            title={`Promote ${memberName}?`}
                            description={`They'll be moved from the waitlist into a confirmed spot for ${summary.name}.`}
                            confirmLabel="Promote"
                            onConfirm={() => handlePromote(entry.id, memberName)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
