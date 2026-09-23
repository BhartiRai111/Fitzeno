"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  UserRoundSearch,
  UserRoundPlus,
  CalendarClock,
  Dumbbell,
  Percent,
  UserMinus,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { LeadFunnel } from "@/components/dashboard/lead-funnel";
import { LeadDetailSheet } from "@/components/dashboard/lead-detail-sheet";
import { AddLeadDialog, type NewLeadInput } from "@/components/dashboard/dialogs/add-lead-dialog";
import { leads as initialLeads } from "@/lib/data/leads";
import { staffMembers } from "@/lib/data/staff";
import { trainers } from "@/lib/data/trainers";
import { membershipPlans } from "@/lib/data/plans";
import { formatDate } from "@/lib/utils-data";
import {
  TODAY,
  LEAD_SOURCES,
  isFollowUpDue,
  isFollowUpOverdue,
  getLeadStats,
  getSourcePerformance,
  getStaffWorkload,
  getTrialConversionRate,
  getClassLabel,
} from "@/lib/lead-helpers";
import type { Lead, LeadLostReason } from "@/lib/data/types";

type TabValue = "all" | "new" | "followups" | "trials" | "converted" | "lost" | "insights";

const CURRENT_USER = "Sam Carter";

function initialsFor(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export function LeadsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "all";
  const initialLeadId = searchParams.get("leadId");

  const [leads, setLeads] = React.useState<Lead[]>(initialLeads);
  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const [search, setSearch] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(initialLeadId);
  const [sheetOpen, setSheetOpen] = React.useState(!!initialLeadId);

  const assigneeOptions = React.useMemo(
    () => Array.from(new Set(["Front Desk", ...staffMembers.map((s) => s.name), ...trainers.map((t) => t.name)])),
    []
  );

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;

  function findLead(id: string) {
    return leads.find((l) => l.id === id);
  }

  function appendNote(lead: Lead, text: string): Lead["notes"] {
    return [...lead.notes, { id: `n-${Date.now()}`, author: CURRENT_USER, date: TODAY, text }];
  }

  function openLead(lead: Lead) {
    setSelectedLeadId(lead.id);
    setSheetOpen(true);
  }

  function handleAdd(input: NewLeadInput) {
    const newLead: Lead = {
      id: `l-${Date.now()}`,
      name: input.name,
      initials: initialsFor(input.name),
      email: input.email,
      phone: input.phone,
      source: input.source,
      interest: input.interest,
      status: "new",
      createdOn: TODAY,
      lastActivity: TODAY,
      nextFollowUp: TODAY,
      assignedTo: input.assignedTo,
      notes: [],
    };
    setLeads((prev) => [newLead, ...prev]);
  }

  function handleLogActivity(id: string, text: string, nextFollowUp: string | null) {
    const lead = findLead(id);
    if (!lead) return;
    const advancesToContacted = lead.status === "new";
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, notes: appendNote(l, text), lastActivity: TODAY, nextFollowUp, status: advancesToContacted ? "contacted" : l.status }
          : l
      )
    );
    toast.success("Activity logged", { description: advancesToContacted ? `${lead.name} moved to Contacted.` : undefined });
  }

  function handleScheduleTrial(id: string, classId: string, trialDate: string) {
    const lead = findLead(id);
    if (!lead) return;
    const label = getClassLabel(classId) ?? "a class";
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: "trial-booked",
              trialClassId: classId,
              trialDate,
              lastActivity: TODAY,
              notes: appendNote(l, `Trial scheduled — ${label} on ${formatDate(trialDate)}.`),
            }
          : l
      )
    );
    toast.success("Trial scheduled", { description: `${lead.name} · ${label}` });
  }

  function handleMarkTrialAttended(id: string) {
    const lead = findLead(id);
    if (!lead) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: "trial-attended", lastActivity: TODAY, notes: appendNote(l, "Attended their trial session.") } : l
      )
    );
    toast.success("Marked as attended");
  }

  function handleMoveToFollowUp(id: string) {
    const lead = findLead(id);
    if (!lead) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: "follow-up", lastActivity: TODAY, notes: appendNote(l, "Not ready yet — moved to follow-up for later.") } : l
      )
    );
    toast.success("Moved to follow-up");
  }

  function handleConvert(id: string, planId: string) {
    const lead = findLead(id);
    if (!lead) return;
    const plan = membershipPlans.find((p) => p.id === planId);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: "converted",
              convertedPlanId: planId,
              convertedOn: TODAY,
              nextFollowUp: null,
              lastActivity: TODAY,
              notes: appendNote(l, `Converted — signed up for the ${plan?.name ?? "selected"} plan.`),
            }
          : l
      )
    );
    toast.success(`${lead.name} converted!`, { description: `Selected the ${plan?.name} plan — finish their setup in Members.` });
  }

  function handleMarkLost(id: string, reason: LeadLostReason, note: string) {
    const lead = findLead(id);
    if (!lead) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: "lost",
              lostReason: reason,
              nextFollowUp: null,
              lastActivity: TODAY,
              notes: appendNote(l, note || `Marked lost — ${reason}.`),
            }
          : l
      )
    );
    toast(`${lead.name} marked as lost`, { description: reason });
  }

  function handleReopen(id: string) {
    const lead = findLead(id);
    if (!lead) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status: "follow-up", lostReason: undefined, nextFollowUp: TODAY, lastActivity: TODAY, notes: appendNote(l, "Reopened — reconsidering after previously being marked lost.") }
          : l
      )
    );
    toast.success("Lead reopened");
  }

  function handleReassign(id: string, assignee: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, assignedTo: assignee } : l)));
    toast.success("Reassigned", { description: assignee });
  }

  const stats = getLeadStats(leads);
  const sourcePerf = getSourcePerformance(leads);
  const staffWorkload = getStaffWorkload(leads);
  const trialConv = getTrialConversionRate(leads);
  const lostLeads = leads.filter((l) => l.status === "lost");
  const lostReasonCounts = lostLeads.reduce<Record<string, number>>((acc, l) => {
    const reason = l.lostReason ?? "Other";
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});

  const tabFiltered = leads.filter((l) => {
    if (tab === "new") return l.status === "new";
    if (tab === "followups") return isFollowUpDue(l);
    if (tab === "trials") return l.status === "trial-booked" || l.status === "trial-attended";
    if (tab === "converted") return l.status === "converted";
    if (tab === "lost") return l.status === "lost";
    return true;
  });

  const filtered = tabFiltered.filter((l) => {
    const matchesSearch =
      search.trim().length === 0 ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === "all" || l.source === sourceFilter;
    const matchesAssignee = assigneeFilter === "all" || l.assignedTo === assigneeFilter;
    return matchesSearch && matchesSource && matchesAssignee;
  });

  const counts = {
    all: leads.length,
    new: stats.newCount,
    followups: stats.followUpsDue,
    trials: leads.filter((l) => l.status === "trial-booked" || l.status === "trial-attended").length,
    converted: stats.converted,
    lost: stats.lost,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & Enquiries"
        description={`${leads.length} total leads · ${stats.conversionRate}% conversion rate`}
        actions={<AddLeadDialog assigneeOptions={assigneeOptions} onAdd={handleAdd} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="New Leads" value={stats.newCount.toString()} icon={UserRoundPlus} helpText="awaiting first contact" />
        <StatCard
          label="Follow-ups Due"
          value={stats.followUpsDue.toString()}
          icon={CalendarClock}
          helpText={stats.followUpsOverdue > 0 ? `${stats.followUpsOverdue} overdue` : "on track"}
        />
        <StatCard label="Upcoming Trials" value={stats.upcomingTrials.toString()} icon={Dumbbell} helpText="scheduled" />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon={Percent} helpText="of all leads" />
        <StatCard label="Converted" value={stats.converted.toString()} icon={Sparkles} helpText="became members" />
        <StatCard label="Lost" value={stats.lost.toString()} icon={UserMinus} helpText="not converting" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="new">New ({counts.new})</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups ({counts.followups})</TabsTrigger>
          <TabsTrigger value="trials">Trials ({counts.trials})</TabsTrigger>
          <TabsTrigger value="converted">Converted ({counts.converted})</TabsTrigger>
          <TabsTrigger value="lost">Lost ({counts.lost})</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {tab === "insights" ? (
          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion funnel</CardTitle>
                  <CardDescription>Enquiry → Trial → Converted</CardDescription>
                </CardHeader>
                <CardContent>
                  <LeadFunnel leads={leads} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Where leads come from</CardTitle>
                  <CardDescription>Volume and conversion rate by source</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sourcePerf.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leads yet.</p>
                  ) : (
                    sourcePerf.map((s) => (
                      <div key={s.source}>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{s.source}</span>
                          <span className="font-medium tabular text-foreground">{s.total} leads · {s.rate}% converted</span>
                        </div>
                        <Progress value={s.rate} className="mt-1" />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trial-to-membership</CardTitle>
                  <CardDescription>Answers: do trials actually convert people?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <p className="font-display text-4xl font-bold tabular text-foreground">{trialConv.rate}%</p>
                    <p className="text-sm text-muted-foreground">
                      {trialConv.converted} of {trialConv.everTrialed} leads who took a trial went on to convert.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Follow-up workload</CardTitle>
                  <CardDescription>Active leads and conversions by staff</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {staffWorkload.map((w) => (
                    <div key={w.assignee} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7 shrink-0"><AvatarFallback className="text-xs">{initialsFor(w.assignee)}</AvatarFallback></Avatar>
                        <span className="font-medium text-foreground">{w.assignee}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{w.activeLeads} active</span>
                        {w.followUpsDue > 0 && <span className="text-warning">{w.followUpsDue} due</span>}
                        <span>{w.converted} converted</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {lostLeads.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Why leads don&apos;t convert</CardTitle>
                    <CardDescription>Answers: what should we fix to lose fewer enquiries?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(lostReasonCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([reason, count]) => (
                        <div key={reason}>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{reason}</span>
                            <span className="font-medium tabular text-foreground">{count}</span>
                          </div>
                          <Progress value={(count / lostLeads.length) * 100} className="mt-1" />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ) : (
          <TabsContent value={tab} className="space-y-4">
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Input
                startIcon={<Search />}
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="sm:w-40"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="sm:w-44"><SelectValue placeholder="Assigned to" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  {assigneeOptions.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {filtered.length === 0 ? (
              <EmptyState
                icon={UserRoundSearch}
                title="No leads match these filters"
                description="Try adjusting your search or filters."
                action={{ label: "Reset filters", onClick: () => { setSearch(""); setSourceFilter("all"); setAssigneeFilter("all"); } }}
              />
            ) : (
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Lead</th>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 font-medium">Interest</th>
                        <th className="px-4 py-3 font-medium">Assigned to</th>
                        <th className="px-4 py-3 font-medium">Next follow-up</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((lead) => {
                        const overdue = isFollowUpOverdue(lead);
                        const dueToday = lead.nextFollowUp === TODAY && (lead.status !== "converted" && lead.status !== "lost");
                        return (
                          <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <button onClick={() => openLead(lead)} className="flex items-center gap-2.5 text-left">
                                <Avatar className="size-8 shrink-0">
                                  <AvatarFallback className="text-xs">{lead.initials}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">{lead.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                                </div>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{lead.source}</td>
                            <td className="px-4 py-3 text-muted-foreground">{lead.interest}</td>
                            <td className="px-4 py-3 text-muted-foreground">{lead.assignedTo}</td>
                            <td className="px-4 py-3">
                              {lead.nextFollowUp ? (
                                <span className={overdue ? "font-medium text-danger" : dueToday ? "font-medium text-warning" : "text-muted-foreground"}>
                                  {formatDate(lead.nextFollowUp)}
                                  {overdue && " · overdue"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => openLead(lead)}>View</Button>
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
        )}
      </Tabs>

      <LeadDetailSheet
        lead={selectedLead}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        assigneeOptions={assigneeOptions}
        onLogActivity={handleLogActivity}
        onScheduleTrial={handleScheduleTrial}
        onMarkTrialAttended={handleMarkTrialAttended}
        onMoveToFollowUp={handleMoveToFollowUp}
        onConvert={handleConvert}
        onMarkLost={handleMarkLost}
        onReopen={handleReopen}
        onReassign={handleReassign}
      />
    </div>
  );
}
