"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MembershipStatusBadge } from "@/components/shared/status-badge";
import { MemberActionsMenu } from "@/components/dashboard/member-actions-menu";
import { AddMemberDialog, type NewMemberInput } from "@/components/dashboard/dialogs/add-member-dialog";
import { useMembersRoster, useCreateMember, useCreateMembership } from "@/hooks/use-members";
import { useTrainersRoster } from "@/hooks/use-trainers";
import { useMembershipPlans } from "@/hooks/use-membership-plans";
import { formatDate, daysBetween } from "@/lib/utils-data";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { Member } from "@/lib/data/types";

const TODAY = new Date().toISOString().slice(0, 10);

type TabValue = "all" | "active" | "expiring" | "expired" | "inactive";

function isInactive(member: Member) {
  return !!member.lastCheckIn && daysBetween(member.lastCheckIn, TODAY) >= 21;
}

export function MembersPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "all";
  const initialPlan = searchParams.get("plan") ?? "all";
  const prefillName = searchParams.get("prefillName");
  const prefillEmail = searchParams.get("prefillEmail") ?? "";
  const prefillPhone = searchParams.get("prefillPhone") ?? "";
  const prefillPlan = searchParams.get("prefillPlan") ?? "";

  const { members, membershipByMemberId, isLoading } = useMembersRoster();
  const { trainers } = useTrainersRoster();
  const { plans: membershipPlans } = useMembershipPlans();
  const createMember = useCreateMember();
  const createMembership = useCreateMembership();
  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const [search, setSearch] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState(initialPlan);
  const [trainerFilter, setTrainerFilter] = React.useState("all");
  const [joinedFilter, setJoinedFilter] = React.useState("all");
  const [addMemberOpen, setAddMemberOpen] = React.useState(!!prefillName);

  async function handleAddMember(input: NewMemberInput) {
    const plan = membershipPlans.find((p) => p.id === input.planId) ?? membershipPlans[0];
    const [firstName, ...rest] = input.name.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;
    try {
      const member = await createMember.mutateAsync({
        firstName,
        lastName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        dateOfBirth: input.dob || undefined,
        trainerId: input.trainerId,
      });
      await createMembership.mutateAsync({ memberId: member.id, planId: input.planId });
      toast.success(`${input.name} is now a member`, { description: `${plan.name} plan · joined ${formatDate(TODAY)}.` });
    } catch (err) {
      const message = err instanceof ApiError || err instanceof NetworkError ? err.message : "Couldn't add this member. Please try again.";
      toast.error(message);
    }
  }

  const tabFiltered = members.filter((m) => {
    if (tab === "active") return m.status === "active";
    if (tab === "expiring") return m.status === "expiring";
    if (tab === "expired") return m.status === "expired" || m.status === "cancelled";
    if (tab === "inactive") return isInactive(m);
    return true;
  });

  const filtered = tabFiltered.filter((m) => {
    const matchesSearch =
      search.trim().length === 0 ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || m.plan === planFilter;
    const matchesTrainer =
      trainerFilter === "all" ||
      (trainerFilter === "unassigned" ? !m.trainerId : m.trainerId === trainerFilter);
    const matchesJoined =
      joinedFilter === "all" ||
      (joinedFilter === "30" && daysBetween(m.joinedOn, TODAY) <= 30) ||
      (joinedFilter === "90" && daysBetween(m.joinedOn, TODAY) <= 90) ||
      (joinedFilter === "year" && m.joinedOn.startsWith("2026"));
    return matchesSearch && matchesPlan && matchesTrainer && matchesJoined;
  });

  const counts = {
    all: members.length,
    active: members.filter((m) => m.status === "active").length,
    expiring: members.filter((m) => m.status === "expiring").length,
    expired: members.filter((m) => m.status === "expired" || m.status === "cancelled").length,
    inactive: members.filter(isInactive).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${members.length} total members`}
        actions={
          <AddMemberDialog
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
            onAdd={handleAddMember}
            defaultValues={
              prefillName
                ? {
                    name: prefillName,
                    email: prefillEmail,
                    phone: prefillPhone,
                    planId: prefillPlan || undefined,
                    note: `${prefillName} converted from a lead — confirm their details and finish setup.`,
                  }
                : undefined
            }
          />
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({counts.expiring})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({counts.expired})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              startIcon={<Search />}
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {membershipPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.name}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={trainerFilter} onValueChange={setTrainerFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Trainer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trainers</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {trainers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={joinedFilter} onValueChange={setJoinedFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Joined" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any join date</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {isLoading ? (
            <Card className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </Card>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={members.length === 0 ? "No members yet" : "No members match these filters"}
              description={members.length === 0 ? "Add your first member to get started." : "Try adjusting your search or filters."}
              action={{ label: "Reset filters", onClick: () => { setSearch(""); setPlanFilter("all"); setTrainerFilter("all"); setJoinedFilter("all"); } }}
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Membership</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Attendance</th>
                      <th className="px-4 py-3 font-medium">Expiry</th>
                      <th className="px-4 py-3 font-medium">Trainer</th>
                      <th className="px-4 py-3 font-medium">Last visit</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => {
                      const trainer = trainers.find((t) => t.id === member.trainerId);
                      return (
                        <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Link href={`/owner/members/${member.id}`} className="flex items-center gap-2.5">
                              <Avatar className="size-8 shrink-0">
                                <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{member.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{member.plan}</td>
                          <td className="px-4 py-3"><MembershipStatusBadge status={member.status} /></td>
                          <td className="px-4 py-3 tabular text-muted-foreground">{member.attendanceThisMonth}/mo</td>
                          <td className="px-4 py-3 text-muted-foreground">{member.expiresOn ? formatDate(member.expiresOn) : "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{trainer?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{member.lastCheckIn ? formatDate(member.lastCheckIn) : "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <MemberActionsMenu member={member} membershipId={membershipByMemberId.get(member.id)?.id ?? null} />
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
      </Tabs>
    </div>
  );
}
