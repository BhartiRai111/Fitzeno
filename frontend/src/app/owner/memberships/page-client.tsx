"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembershipStatusBadge } from "@/components/shared/status-badge";
import { OwnerPlanCard } from "@/components/dashboard/owner-plan-card";
import { PlanDialog } from "@/components/dashboard/dialogs/plan-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { CalendarCheck2 } from "lucide-react";
import { useMembersRoster, useRenewMembership } from "@/hooks/use-members";
import { useMembershipPlans } from "@/hooks/use-membership-plans";
import { ApiError, NetworkError } from "@/lib/api/types";
import { TODAY } from "@/lib/booking-helpers";
import { formatDate, daysBetween } from "@/lib/utils-data";
import type { Member } from "@/lib/data/types";

type TabValue = "plans" | "active" | "expiring" | "expired" | "renewals";

function MemberTable({
  rows,
  emphasizeRenew = false,
  onRenew,
}: {
  rows: Member[];
  emphasizeRenew?: boolean;
  onRenew: (memberId: string) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={CalendarCheck2} title="Nothing here" description="No members match this view." />;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((member) => (
              <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{member.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{member.plan}</td>
                <td className="px-4 py-3"><MembershipStatusBadge status={member.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">
                  {member.expiresOn ? formatDate(member.expiresOn) : "—"}
                  {member.expiresOn && daysBetween(TODAY, member.expiresOn) <= 0 && member.status !== "cancelled" && (
                    <span className="ml-1.5 text-xs text-danger">overdue</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <ConfirmActionDialog
                    trigger={
                      <Button size="sm" variant={emphasizeRenew ? "outline" : "ghost"}>
                        Renew
                      </Button>
                    }
                    title={`Renew ${member.name}'s membership?`}
                    description={`Extend their ${member.plan} plan by one billing cycle.`}
                    confirmLabel="Renew Membership"
                    onConfirm={() => onRenew(member.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function MembershipsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "plans";
  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const [search, setSearch] = React.useState("");

  const { members, membershipByMemberId, isLoading: rosterLoading, isError: rosterError } = useMembersRoster();
  const { plans, isLoading: plansLoading } = useMembershipPlans();
  const renewMembership = useRenewMembership();

  const activeMembers = members.filter((m) => m.status === "active");
  const expiringMembers = members.filter((m) => m.status === "expiring");
  const expiredMembers = members.filter((m) => m.status === "expired" || m.status === "cancelled");
  const renewalQueue = [...expiringMembers, ...expiredMembers].sort((a, b) =>
    a.expiresOn < b.expiresOn ? -1 : 1
  );

  function applySearch(rows: Member[]) {
    if (!search.trim()) return rows;
    return rows.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
  }

  function handleRenew(memberId: string) {
    const membership = membershipByMemberId.get(memberId);
    const member = members.find((m) => m.id === memberId);
    if (!membership || !member) return;

    renewMembership.mutate(
      { id: membership.id, planId: membership.plan.id },
      {
        onSuccess: (updated) => {
          toast.success(`${member.name}'s membership renewed`, {
            description: `Now active until ${formatDate(updated.endDate)}.`,
          });
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError || err instanceof NetworkError
              ? err.message
              : "Couldn't renew this membership. Please try again."
          );
        },
      }
    );
  }

  if (rosterLoading || plansLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Memberships" description="Loading…" />
      </div>
    );
  }

  if (rosterError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Memberships" />
        <EmptyState icon={CalendarCheck2} title="Couldn't load memberships" description="Check your connection and refresh the page." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memberships"
        description={`${plans.length} plans · ${activeMembers.length} active members`}
        actions={<PlanDialog />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="active">Active ({activeMembers.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({expiringMembers.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expiredMembers.length})</TabsTrigger>
          <TabsTrigger value="renewals">Renewals ({renewalQueue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plans.length === 0 ? (
            <EmptyState icon={CalendarCheck2} title="No plans yet" description="Create a membership plan for members to choose from." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <OwnerPlanCard key={plan.id} plan={plan} members={members} />
              ))}
            </div>
          )}
        </TabsContent>

        {(["active", "expiring", "expired", "renewals"] as const).map((value) => (
          <TabsContent key={value} value={value} className="space-y-4">
            <Card className="p-4">
              <Input
                startIcon={<Search />}
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:max-w-xs"
              />
            </Card>
            {value === "active" && <MemberTable rows={applySearch(activeMembers)} onRenew={handleRenew} />}
            {value === "expiring" && <MemberTable rows={applySearch(expiringMembers)} emphasizeRenew onRenew={handleRenew} />}
            {value === "expired" && <MemberTable rows={applySearch(expiredMembers)} emphasizeRenew onRenew={handleRenew} />}
            {value === "renewals" && <MemberTable rows={applySearch(renewalQueue)} emphasizeRenew onRenew={handleRenew} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
