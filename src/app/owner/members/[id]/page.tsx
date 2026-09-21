"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Cake,
  MapPin,
  ShieldAlert,
  RefreshCcw,
  Snowflake,
  Ban,
  UserRound,
  CreditCard,
  CalendarCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MembershipStatusBadge,
  PaymentStatusBadge,
  BookingStatusBadge,
} from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { EditMemberDialog } from "@/components/dashboard/dialogs/edit-member-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { members } from "@/lib/data/members";
import { trainers } from "@/lib/data/trainers";
import { payments } from "@/lib/data/payments";
import { attendanceRecords } from "@/lib/data/attendance";
import { classBookings } from "@/lib/data/class-bookings";
import { gymClasses } from "@/lib/data/classes";
import { ptSessions } from "@/lib/data/pt-sessions";
import { formatCurrency, formatDate } from "@/lib/utils-data";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const member = members.find((m) => m.id === params.id);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [notes, setNotes] = React.useState(member?.notes ?? []);

  if (!member) {
    return (
      <EmptyState
        icon={UserRound}
        title="Member not found"
        description="This member may have been removed."
        action={{ label: "Back to Members", href: "/owner/members" }}
      />
    );
  }

  const trainer = trainers.find((t) => t.id === member.trainerId);
  const memberPayments = payments.filter((p) => p.memberName === member.name);
  const memberAttendance = attendanceRecords.filter((a) => a.memberId === member.id);
  const memberBookings = classBookings.filter((b) => b.memberName === member.name);
  const memberPt = ptSessions.filter((s) => s.memberName === member.name);

  function addNote() {
    if (!noteDraft.trim()) return;
    setNotes((prev) => [
      { id: `note-${Date.now()}`, author: "Sam Carter", date: "2026-09-21", text: noteDraft.trim() },
      ...prev,
    ]);
    setNoteDraft("");
    toast.success("Note added");
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push("/owner/members")}>
        <ArrowLeft className="size-4" />
        Back to Members
      </Button>

      <PageHeader
        title={member.name}
        description={`${member.plan} plan · Member since ${formatDate(member.joinedOn)}`}
        actions={
          <>
            <EditMemberDialog member={member} />
            <ConfirmActionDialog
              trigger={<Button size="sm" variant="outline"><RefreshCcw className="size-4" />Renew</Button>}
              title={`Renew ${member.name}'s membership?`}
              description={`This will extend their ${member.plan} plan by one billing cycle.`}
              confirmLabel="Renew Membership"
              onConfirm={() => toast.success(`${member.name}'s membership renewed`)}
            />
            <ConfirmActionDialog
              trigger={<Button size="sm" variant="outline"><Snowflake className="size-4" />Freeze</Button>}
              title={`Freeze ${member.name}'s membership?`}
              description="Their billing and access will pause until unfrozen."
              confirmLabel="Freeze Membership"
              onConfirm={() => toast.success(`${member.name}'s membership frozen`)}
            />
            <ConfirmActionDialog
              trigger={<Button size="sm" variant="destructive"><Ban className="size-4" />Cancel</Button>}
              title={`Cancel ${member.name}'s membership?`}
              description="This cancels their plan at the end of the current billing period."
              confirmLabel="Cancel Membership"
              destructive
              onConfirm={() => toast.success(`${member.name}'s membership cancelled`)}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                <AvatarFallback className="text-lg">{member.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-display text-base font-semibold text-foreground">{member.name}</p>
                <MembershipStatusBadge status={member.status} />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="size-4 shrink-0" /> {member.email}
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="size-4 shrink-0" /> {member.phone}
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Cake className="size-4 shrink-0" /> {formatDate(member.dob)} · {member.gender}
              </div>
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="size-4 shrink-0 mt-0.5" /> {member.address}
              </div>
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" /> {member.emergencyContact}
              </div>
            </div>
            <Separator className="my-4" />
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium text-foreground">{member.plan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="font-medium text-foreground">{formatDate(member.expiresOn)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Trainer</dt>
                <dd className="font-medium text-foreground">{trainer?.name ?? "Unassigned"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Lifetime value</dt>
                <dd className="font-medium tabular text-foreground">{formatCurrency(member.lifetimeValue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Attendance this month</dt>
                <dd className="font-medium tabular text-foreground">{member.attendanceThisMonth} visits</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs defaultValue="payments">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="payments">
                {memberPayments.length === 0 ? (
                  <EmptyState icon={CreditCard} title="No payments yet" description="No transactions recorded for this member." />
                ) : (
                  <div className="space-y-1">
                    {memberPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md px-2 py-2.5 hover:bg-muted/40">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.plan}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.date)} · {p.method} · {p.invoiceId}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular text-sm font-medium text-foreground">{formatCurrency(p.amount)}</span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attendance">
                {memberAttendance.length === 0 ? (
                  <EmptyState icon={CalendarCheck} title="No attendance yet" description="No check-ins recorded for this member." />
                ) : (
                  <div className="space-y-1">
                    {memberAttendance.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-md px-2 py-2.5 hover:bg-muted/40">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatDate(a.date)}</p>
                          <p className="text-xs text-muted-foreground">{a.method}</p>
                        </div>
                        <p className="text-sm tabular text-muted-foreground">
                          {a.checkInTime} — {a.checkOutTime ?? "still in"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bookings">
                {memberBookings.length === 0 && memberPt.length === 0 ? (
                  <EmptyState icon={CalendarCheck} title="No bookings yet" description="No class or PT bookings recorded." />
                ) : (
                  <div className="space-y-1">
                    {memberBookings.map((b) => {
                      const gymClass = gymClasses.find((c) => c.id === b.classId);
                      return (
                        <div key={b.id} className="flex items-center justify-between rounded-md px-2 py-2.5 hover:bg-muted/40">
                          <div>
                            <p className="text-sm font-medium text-foreground">{gymClass?.name}</p>
                            <p className="text-xs text-muted-foreground">Booked {formatDate(b.bookedOn)}</p>
                          </div>
                          <BookingStatusBadge status={b.status} />
                        </div>
                      );
                    })}
                    {memberPt.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-2.5 hover:bg-muted/40">
                        <div>
                          <p className="text-sm font-medium text-foreground">Personal Training</p>
                          <p className="text-xs text-muted-foreground">{formatDate(s.date)} · {s.startTime}</p>
                        </div>
                        <BookingStatusBadge status={s.status} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note about this member..."
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                  </div>
                  <Button size="sm" onClick={addNote} disabled={!noteDraft.trim()}>Add Note</Button>
                  <Separator />
                  {notes.length === 0 ? (
                    <EmptyState icon={UserRound} title="No notes yet" description="Add your first observation about this member." />
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="rounded-md border border-border p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{note.author}</span>
                            <span>{formatDate(note.date)}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-foreground">{note.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <Link href="/owner/members" className="hover:text-foreground">Back to all members</Link>
      </div>
    </div>
  );
}
