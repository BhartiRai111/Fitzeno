"use client";

import * as React from "react";
import {
  Dumbbell,
  UserRound,
  MapPin,
  ListOrdered,
  CalendarCheck,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { RescheduleClassDialog } from "@/components/portal/reschedule-class-dialog";
import { BookPtDialog } from "@/components/portal/book-pt-dialog";
import { ClassDetailSheet } from "@/components/portal/class-detail-sheet";
import { useBookings } from "@/components/portal/bookings-provider";
import { trainers } from "@/lib/data/trainers";
import { formatOccurrence, isWithinCancellationWindow } from "@/lib/booking-helpers";
import { formatDate } from "@/lib/utils-data";
import type { ClassBooking, GymClass } from "@/lib/data/types";

type TabValue = "upcoming" | "waitlisted" | "past";

export default function PortalBookingsPage() {
  const { myClassBookings, myPtSessions, cancelClassBooking, cancelPt } = useBookings();
  const [tab, setTab] = React.useState<TabValue>("upcoming");
  const [rescheduleTarget, setRescheduleTarget] = React.useState<ClassBooking | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [ptDialogOpen, setPtDialogOpen] = React.useState(false);
  const [ptPreselectTrainer, setPtPreselectTrainer] = React.useState<string | undefined>();
  const [rebookClass, setRebookClass] = React.useState<GymClass | null>(null);
  const [rebookOpen, setRebookOpen] = React.useState(false);

  const upcomingClasses = myClassBookings.filter((v) => v.booking.status === "booked");
  const waitlisted = myClassBookings.filter((v) => v.booking.status === "waitlisted");
  const upcomingPt = myPtSessions.filter((s) => s.status === "booked");
  const pastClasses = myClassBookings.filter((v) => ["attended", "no-show", "cancelled"].includes(v.booking.status));
  const pastPt = myPtSessions.filter((s) => ["attended", "no-show", "cancelled"].includes(s.status));

  const upcomingCount = upcomingClasses.length + upcomingPt.length;
  const pastCount = pastClasses.length + pastPt.length;

  function openReschedule(booking: ClassBooking) {
    setRescheduleTarget(booking);
    setRescheduleOpen(true);
  }

  function openPtBooking(trainerId?: string) {
    setPtPreselectTrainer(trainerId);
    setPtDialogOpen(true);
  }

  function openRebook(gymClass: GymClass) {
    setRebookClass(gymClass);
    setRebookOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Bookings"
        description="Manage your classes, waitlist spots, and personal training sessions."
        actions={
          <Button size="sm" onClick={() => openPtBooking()}>
            Book PT Session
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
          <TabsTrigger value="waitlisted">Waitlisted ({waitlisted.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcomingCount === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No upcoming bookings"
              description="Book a class or a PT session to see it here."
              action={{ label: "Browse Classes", href: "/portal/classes" }}
            />
          ) : (
            <>
              {upcomingClasses.map(({ booking, gymClass, occurrenceDate }) => {
                const trainer = trainers.find((t) => t.id === gymClass.trainerId);
                const withinWindow = isWithinCancellationWindow(occurrenceDate, gymClass.startTime);
                return (
                  <Card key={booking.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <Dumbbell className="size-[18px]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{gymClass.name}</p>
                        <p className="text-xs text-muted-foreground">
                          with {trainer?.name} · {formatOccurrence(gymClass.day)} · {gymClass.startTime}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {gymClass.location}
                        </p>
                        {withinWindow && (
                          <p className="mt-1 text-xs font-medium text-warning">
                            Starts within 4 hours — cancellation credit won&apos;t apply
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <BookingStatusBadge status={booking.status} />
                      <Button size="sm" variant="outline" onClick={() => openReschedule(booking)}>
                        Reschedule
                      </Button>
                      <ConfirmActionDialog
                        trigger={<Button size="sm" variant="ghost">Cancel</Button>}
                        title={`Cancel ${gymClass.name}?`}
                        description={
                          withinWindow
                            ? "This class starts within 4 hours, so this cancellation won't be refunded as a credit."
                            : "You can rebook any time before the class fills up."
                        }
                        confirmLabel="Cancel Booking"
                        destructive
                        onConfirm={() => cancelClassBooking(booking.id)}
                      />
                    </div>
                  </Card>
                );
              })}
              {upcomingPt.map((session) => {
                const trainer = trainers.find((t) => t.id === session.trainerId);
                const withinWindow = isWithinCancellationWindow(session.date, session.startTime);
                return (
                  <Card key={session.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <UserRound className="size-[18px]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Personal Training</p>
                        <p className="text-xs text-muted-foreground">
                          with {trainer?.name} · {formatDate(session.date)} · {session.startTime}
                        </p>
                        {withinWindow && (
                          <p className="mt-1 text-xs font-medium text-warning">Starts within 4 hours</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <BookingStatusBadge status={session.status} />
                      <ConfirmActionDialog
                        trigger={<Button size="sm" variant="ghost">Cancel</Button>}
                        title="Cancel this session?"
                        description={`Your session with ${trainer?.name} will be released.`}
                        confirmLabel="Cancel Session"
                        destructive
                        onConfirm={() => cancelPt(session.id)}
                      />
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        <TabsContent value="waitlisted" className="space-y-3">
          {waitlisted.length === 0 ? (
            <EmptyState
              icon={ListOrdered}
              title="You're not on any waitlists"
              description="Full classes will offer a waitlist spot when you try to book."
            />
          ) : (
            waitlisted.map(({ booking, gymClass, waitlistPosition }) => {
              const trainer = trainers.find((t) => t.id === gymClass.trainerId);
              return (
                <Card key={booking.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning-tint text-warning">
                      <ListOrdered className="size-[18px]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{gymClass.name}</p>
                      <p className="text-xs text-muted-foreground">
                        with {trainer?.name} · {formatOccurrence(gymClass.day)} · {gymClass.startTime}
                      </p>
                      <p className="mt-1 text-xs font-medium text-warning">
                        #{waitlistPosition} on the waitlist
                      </p>
                    </div>
                  </div>
                  <ConfirmActionDialog
                    trigger={<Button size="sm" variant="outline" className="shrink-0">Leave Waitlist</Button>}
                    title={`Leave the waitlist for ${gymClass.name}?`}
                    description="You'll lose your spot in the queue."
                    confirmLabel="Leave Waitlist"
                    onConfirm={() => cancelClassBooking(booking.id)}
                  />
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {pastCount === 0 ? (
            <EmptyState icon={History} title="No booking history yet" description="Attended and cancelled bookings will show up here." />
          ) : (
            <>
              {pastClasses.map(({ booking, gymClass }) => {
                const trainer = trainers.find((t) => t.id === gymClass.trainerId);
                return (
                  <Card key={booking.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Dumbbell className="size-[18px]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{gymClass.name}</p>
                        <p className="text-xs text-muted-foreground">
                          with {trainer?.name} · booked {formatDate(booking.bookedOn)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <BookingStatusBadge status={booking.status} />
                      <Button size="sm" variant="ghost" onClick={() => openRebook(gymClass)}>
                        Book Again
                      </Button>
                    </div>
                  </Card>
                );
              })}
              {pastPt.map((session) => {
                const trainer = trainers.find((t) => t.id === session.trainerId);
                return (
                  <Card key={session.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <UserRound className="size-[18px]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Personal Training</p>
                        <p className="text-xs text-muted-foreground">
                          with {trainer?.name} · {formatDate(session.date)}
                        </p>
                        {session.notes && <p className="mt-1 text-xs text-muted-foreground">&ldquo;{session.notes}&rdquo;</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <BookingStatusBadge status={session.status} />
                      <Button size="sm" variant="ghost" onClick={() => openPtBooking(session.trainerId)}>
                        Book Again
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>
      </Tabs>

      <RescheduleClassDialog booking={rescheduleTarget} open={rescheduleOpen} onOpenChange={setRescheduleOpen} />
      <BookPtDialog open={ptDialogOpen} onOpenChange={setPtDialogOpen} preselectedTrainerId={ptPreselectTrainer} />
      <ClassDetailSheet gymClass={rebookClass} open={rebookOpen} onOpenChange={setRebookOpen} />
    </div>
  );
}
