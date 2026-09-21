"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, UserRoundSearch } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { LeadFunnel } from "@/components/dashboard/lead-funnel";
import { LeadDetailSheet } from "@/components/dashboard/lead-detail-sheet";
import { AddLeadDialog } from "@/components/dashboard/dialogs/add-lead-dialog";
import { leads } from "@/lib/data/leads";
import { formatDate } from "@/lib/utils-data";
import type { Lead, LeadSource } from "@/lib/data/types";

const TODAY = "2026-09-21";
const sources: LeadSource[] = ["Website", "Instagram", "Referral", "Walk-in", "Advertisement"];
const assignees = Array.from(new Set(leads.map((l) => l.assignedTo)));

type TabValue = "all" | "new" | "followups" | "trials" | "converted";

export function LeadsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "all";

  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const [search, setSearch] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const followUpsDue = leads.filter(
    (l) => l.nextFollowUp && l.nextFollowUp <= TODAY && l.status !== "converted" && l.status !== "lost"
  );

  const tabFiltered = leads.filter((l) => {
    if (tab === "new") return l.status === "new";
    if (tab === "followups") return followUpsDue.some((f) => f.id === l.id);
    if (tab === "trials") return l.status === "trial-booked" || l.status === "trial-attended";
    if (tab === "converted") return l.status === "converted";
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
    new: leads.filter((l) => l.status === "new").length,
    followups: followUpsDue.length,
    trials: leads.filter((l) => l.status === "trial-booked" || l.status === "trial-attended").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  const conversionRate = ((counts.converted / leads.length) * 100).toFixed(0);

  function openLead(lead: Lead) {
    setSelectedLead(lead);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & Enquiries"
        description={`${leads.length} total leads · ${conversionRate}% conversion rate`}
        actions={<AddLeadDialog />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
            <CardTitle>Follow-ups today</CardTitle>
            <CardDescription>{formatDate(TODAY)}</CardDescription>
          </CardHeader>
          <CardContent>
            {followUpsDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due today.</p>
            ) : (
              <div className="space-y-1">
                {followUpsDue.slice(0, 4).map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-xs">{lead.initials}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm text-foreground">{lead.name}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="new">New ({counts.new})</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups ({counts.followups})</TabsTrigger>
          <TabsTrigger value="trials">Trials ({counts.trials})</TabsTrigger>
          <TabsTrigger value="converted">Converted ({counts.converted})</TabsTrigger>
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
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Assigned to" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {assignees.map((a) => (
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
                      <th className="px-4 py-3 font-medium">Last contact</th>
                      <th className="px-4 py-3 font-medium">Next follow-up</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => (
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
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(lead.lastActivity)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : "—"}
                        </td>
                        <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openLead(lead)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <LeadDetailSheet lead={selectedLead} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
