"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, Users, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StaffStatusBadge, BookingStatusBadge } from "@/components/shared/status-badge";
import { InviteTeamMemberDialog, type NewTeamMemberInput } from "@/components/dashboard/dialogs/invite-team-member-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { StaffDetailSheet } from "@/components/dashboard/staff/staff-detail-sheet";
import { PermissionMatrix } from "@/components/dashboard/staff/permission-matrix";
import { AccessPreview } from "@/components/dashboard/staff/access-preview";
import { trainers as initialTrainers } from "@/lib/data/trainers";
import { staffMembers as initialStaffMembers } from "@/lib/data/staff";
import { gymClasses, daysOfWeek } from "@/lib/data/classes";
import { trainerPerformance } from "@/lib/data/reports";
import { ptSessions as initialPtSessions } from "@/lib/data/pt-sessions";
import { formatDate } from "@/lib/utils-data";
import { trainerToTeamMember, staffToTeamMember, type TeamMember } from "@/lib/team";
import {
  ROLE_LABELS,
  ROLE_BADGE_VARIANT,
  ROLE_DEFAULT_PERMISSIONS,
  getEffectivePermissions,
} from "@/lib/permissions";
import type { Trainer, StaffMember, StaffAccessRole, PermissionArea, PermissionLevel, StaffStatus } from "@/lib/data/types";

type TabValue = "team" | "roles" | "schedules" | "pt";

let nextId = 100;

export function StaffPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "team";
  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const [trainers, setTrainers] = React.useState<Trainer[]>(initialTrainers);
  const [staffMembers, setStaffMembers] = React.useState<StaffMember[]>(initialStaffMembers);
  const [ptSessions, setPtSessions] = React.useState(initialPtSessions);
  const [roleDefaults, setRoleDefaults] = React.useState(ROLE_DEFAULT_PERMISSIONS);

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<StaffAccessRole | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<StaffStatus | "all">("all");

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [previewRole, setPreviewRole] = React.useState<StaffAccessRole>("front-desk");

  const teamMembers: TeamMember[] = React.useMemo(
    () => [...trainers.map(trainerToTeamMember), ...staffMembers.map(staffToTeamMember)],
    [trainers, staffMembers]
  );

  const filtered = teamMembers.filter((m) => {
    const matchesSearch = search.trim().length === 0 || m.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.accessRole === roleFilter;
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const selectedMember = teamMembers.find((m) => m.id === selectedId) ?? null;
  const selectedLiveStats =
    selectedMember?.kind === "trainer"
      ? {
          classCount: gymClasses.filter((c) => c.trainerId === selectedMember.id).length,
          sessionsRun: trainerPerformance.find((p) => p.trainerId === selectedMember.id)?.sessionsRun ?? 0,
          utilization: trainerPerformance.find((p) => p.trainerId === selectedMember.id)?.utilization ?? 0,
        }
      : undefined;

  function openDetail(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function updateOverrides(id: string, overrides: Partial<Record<PermissionArea, PermissionLevel>>) {
    setTrainers((prev) => prev.map((t) => (t.id === id ? { ...t, permissionOverrides: overrides } : t)));
    setStaffMembers((prev) => prev.map((s) => (s.id === id ? { ...s, permissionOverrides: overrides } : s)));
  }

  function setStatus(id: string, status: StaffStatus) {
    setTrainers((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    setStaffMembers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    const person = teamMembers.find((m) => m.id === id);
    if (person) {
      toast.success(
        status === "active" ? `${person.name} is active again` : `${person.name} was deactivated`,
        { description: status === "active" ? "They now have access based on their role." : "Their dashboard access has been revoked." }
      );
    }
  }

  function resendInvite(id: string) {
    const person = teamMembers.find((m) => m.id === id);
    toast.success("Invite resent", { description: person ? `Sent again to ${person.email}.` : undefined });
  }

  function handleInvite(input: NewTeamMemberInput) {
    const id = input.accessRole === "trainer" ? `tr-${nextId++}` : `st-${nextId++}`;
    const initials = input.name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    if (input.accessRole === "trainer") {
      const colors: Trainer["color"][] = ["indigo", "lime", "amber", "sky"];
      const newTrainer: Trainer = {
        id,
        name: input.name,
        initials: initials || "?",
        role: input.title,
        specialties: (input.specialties ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        bio: "",
        rating: 0,
        reviewCount: 0,
        yearsExperience: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        email: input.email,
        phone: "—",
        joinedOn: new Date().toISOString().slice(0, 10),
        status: "invited",
        permissionOverrides: {},
      };
      setTrainers((prev) => [newTrainer, ...prev]);
    } else {
      const newStaff: StaffMember = {
        id,
        name: input.name,
        initials: initials || "?",
        title: input.title,
        accessRole: input.accessRole,
        email: input.email,
        phone: "—",
        status: "invited",
        joinedOn: new Date().toISOString().slice(0, 10),
        permissionOverrides: {},
        recentActivity: [],
      };
      setStaffMembers((prev) => [newStaff, ...prev]);
    }
  }

  function updateRoleDefault(role: StaffAccessRole, area: PermissionArea, level: PermissionLevel) {
    setRoleDefaults((prev) => ({ ...prev, [role]: { ...prev[role], [area]: level } }));
  }

  function markPtStatus(sessionId: string, status: "attended" | "cancelled" | "no-show") {
    setPtSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status } : s)));
    toast.success(status === "attended" ? "Marked as attended" : status === "no-show" ? "Marked as no-show" : "Session cancelled");
  }

  const activeCount = teamMembers.filter((m) => m.status === "active").length;
  const previewPermissions = getEffectivePermissions(previewRole, {}, roleDefaults);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Access"
        description={`${teamMembers.length} people · ${activeCount} active`}
        actions={<InviteTeamMemberDialog onInvite={handleInvite} />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="pt">Personal Training</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              startIcon={<Search />}
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as StaffAccessRole | "all")}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {(Object.keys(ROLE_LABELS) as StaffAccessRole[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StaffStatus | "all")}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No one matches these filters"
              description="Try adjusting your search or filters."
              action={{ label: "Reset filters", onClick: () => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); } }}
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openDetail(member.id)}
                            className="flex items-center gap-2.5 text-left"
                          >
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{member.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{member.title}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ROLE_BADGE_VARIANT[member.accessRole]}>{ROLE_LABELS[member.accessRole]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div>{member.email}</div>
                          {member.phone !== "—" && <div className="mt-0.5">{member.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(member.joinedOn)}</td>
                        <td className="px-4 py-3"><StaffStatusBadge status={member.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openDetail(member.id)}>
                              View
                            </Button>
                            {member.accessRole !== "owner" && member.status === "active" && (
                              <ConfirmActionDialog
                                trigger={<Button size="sm" variant="ghost" className="text-destructive">Deactivate</Button>}
                                title={`Deactivate ${member.name}?`}
                                description="They'll immediately lose access to the dashboard. You can reactivate them at any time."
                                confirmLabel="Deactivate"
                                destructive
                                onConfirm={() => setStatus(member.id, "inactive")}
                              />
                            )}
                            {member.accessRole !== "owner" && member.status === "inactive" && (
                              <Button size="sm" variant="ghost" onClick={() => setStatus(member.id, "active")}>
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className="flex items-start gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Who has access to what?</p>
              <p className="text-sm text-muted-foreground">
                Each role sets a default access level for every area of Fitzeno. Adjust a role here to update everyone with that
                role — or fine-tune an individual&apos;s access from their profile in the Team tab.
              </p>
            </div>
          </Card>

          <PermissionMatrix permissions={roleDefaults} onChange={updateRoleDefault} />

          <Card className="p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Preview navigation access</p>
                <p className="text-sm text-muted-foreground">See exactly what a role would see in the sidebar.</p>
              </div>
              <Select value={previewRole} onValueChange={(v) => setPreviewRole(v as StaffAccessRole)}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as StaffAccessRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AccessPreview permissions={previewPermissions} />
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
                    <th className="px-4 py-3 font-medium" />
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
                        <td className="px-4 py-3 text-right">
                          {session.status === "booked" && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => markPtStatus(session.id, "attended")}>
                                Mark Attended
                              </Button>
                              <ConfirmActionDialog
                                trigger={<Button size="sm" variant="ghost" className="text-destructive">Cancel</Button>}
                                title="Cancel this session?"
                                description={`${session.memberName}'s session with ${trainer?.name} will be released.`}
                                confirmLabel="Cancel Session"
                                destructive
                                onConfirm={() => markPtStatus(session.id, "cancelled")}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <StaffDetailSheet
        member={selectedMember}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateOverrides={updateOverrides}
        onSetStatus={setStatus}
        onResendInvite={resendInvite}
        liveStats={selectedLiveStats}
        roleDefaults={roleDefaults}
      />
    </div>
  );
}
