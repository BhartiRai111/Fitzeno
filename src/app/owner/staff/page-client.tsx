"use client";

import * as React from "react";
import { Star, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { AddTrainerDialog } from "@/components/dashboard/dialogs/add-trainer-dialog";
import { InviteStaffDialog } from "@/components/dashboard/dialogs/invite-staff-dialog";
import { trainers } from "@/lib/data/trainers";
import { staffMembers } from "@/lib/data/staff";
import { gymClasses, daysOfWeek } from "@/lib/data/classes";
import { trainerPerformance } from "@/lib/data/reports";
import { ptSessions } from "@/lib/data/pt-sessions";
import { formatDate } from "@/lib/utils-data";

type TabValue = "trainers" | "staff" | "schedules" | "pt";

export function StaffPageClient() {
  const [tab, setTab] = React.useState<TabValue>("trainers");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainers & Staff"
        description={`${trainers.length} trainers · ${staffMembers.length} staff members`}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="pt">Personal Training</TabsTrigger>
        </TabsList>

        <TabsContent value="trainers" className="space-y-4">
          <div className="flex justify-end"><AddTrainerDialog /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => {
              const perf = trainerPerformance.find((p) => p.trainerId === trainer.id);
              const classCount = gymClasses.filter((c) => c.trainerId === trainer.id).length;
              return (
                <Card key={trainer.id} className="p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12">
                      <AvatarFallback>{trainer.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{trainer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{trainer.role}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {trainer.specialties.map((s) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-display text-sm font-bold tabular text-foreground">{classCount}</p>
                      <p className="text-[11px] text-muted-foreground">Classes</p>
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold tabular text-foreground">{perf?.sessionsRun ?? 0}</p>
                      <p className="text-[11px] text-muted-foreground">Sessions/mo</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="flex items-center gap-0.5 font-display text-sm font-bold tabular text-foreground">
                        <Star className="size-3 fill-brand-lime text-brand-lime" />
                        {trainer.rating}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Rating</p>
                    </div>
                  </div>
                  {perf && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Utilization</span>
                        <span className="tabular">{perf.utilization}%</span>
                      </div>
                      <Progress value={perf.utilization} className="mt-1" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <div className="flex justify-end"><InviteStaffDialog /></div>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff) => (
                    <tr key={staff.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs">{staff.initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{staff.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{staff.role}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Mail className="size-3.5" />{staff.email}</div>
                        <div className="mt-0.5 flex items-center gap-1.5"><Phone className="size-3.5" />{staff.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(staff.joinedOn)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={staff.status === "active" ? "success" : staff.status === "invited" ? "info" : "default"}>
                          {staff.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="sticky left-0 bg-muted/30 px-4 py-3 font-medium">Trainer</th>
                    {daysOfWeek.map((d) => (
                      <th key={d} className="px-3 py-3 font-medium">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trainers.map((trainer) => (
                    <tr key={trainer.id} className="border-b border-border last:border-0">
                      <td className="sticky left-0 bg-card px-4 py-3 font-medium text-foreground">{trainer.name}</td>
                      {daysOfWeek.map((d) => {
                        const dayClasses = gymClasses.filter((c) => c.trainerId === trainer.id && c.day === d);
                        return (
                          <td key={d} className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              {dayClasses.length === 0 ? (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              ) : (
                                dayClasses.map((c) => (
                                  <span key={c.id} className="w-fit rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                                    {c.startTime}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pt">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Trainer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ptSessions.map((session) => {
                    const trainer = trainers.find((t) => t.id === session.trainerId);
                    return (
                      <tr key={session.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">{session.memberInitials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{session.memberName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{trainer?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(session.date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{session.startTime}</td>
                        <td className="px-4 py-3 text-muted-foreground">{session.duration} min</td>
                        <td className="px-4 py-3"><BookingStatusBadge status={session.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
