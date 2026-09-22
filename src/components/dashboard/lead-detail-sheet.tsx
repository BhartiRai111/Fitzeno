"use client";

import * as React from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  Tag,
  Calendar,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  RotateCcw,
  ArrowRight,
  PartyPopper,
  Dumbbell,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { membershipPlans } from "@/lib/data/plans";
import { formatDate } from "@/lib/utils-data";
import { TODAY, LEAD_LOST_REASONS, getTrialClassOptions, getClassLabel } from "@/lib/lead-helpers";
import type { Lead, LeadLostReason } from "@/lib/data/types";

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assigneeOptions: string[];
  onLogActivity: (leadId: string, text: string, nextFollowUp: string | null) => void;
  onScheduleTrial: (leadId: string, classId: string, trialDate: string) => void;
  onMarkTrialAttended: (leadId: string) => void;
  onMoveToFollowUp: (leadId: string) => void;
  onConvert: (leadId: string, planId: string) => void;
  onMarkLost: (leadId: string, reason: LeadLostReason, note: string) => void;
  onReopen: (leadId: string) => void;
  onReassign: (leadId: string, assignee: string) => void;
}

type InlineForm = "none" | "trial" | "lost" | "convert";

type LeadDetailBodyProps = Omit<LeadDetailSheetProps, "open" | "onOpenChange" | "lead"> & { lead: Lead };

function LeadDetailBody({
  lead,
  assigneeOptions,
  onLogActivity,
  onScheduleTrial,
  onMarkTrialAttended,
  onMoveToFollowUp,
  onConvert,
  onMarkLost,
  onReopen,
  onReassign,
}: LeadDetailBodyProps) {
  const [noteDraft, setNoteDraft] = React.useState("");
  const [nextFollowUpDraft, setNextFollowUpDraft] = React.useState(lead.nextFollowUp ?? "");
  const [form, setForm] = React.useState<InlineForm>("none");
  const trialOptions = React.useMemo(() => getTrialClassOptions(), []);
  const [trialClassId, setTrialClassId] = React.useState(trialOptions[0]?.id ?? "");
  const [lostReason, setLostReason] = React.useState<LeadLostReason>("No response");
  const [lostNote, setLostNote] = React.useState("");
  const [planId, setPlanId] = React.useState(membershipPlans[1]?.id ?? "");

  const isActive = lead.status !== "converted" && lead.status !== "lost";

  function submitActivity() {
    if (!noteDraft.trim()) return;
    onLogActivity(lead.id, noteDraft.trim(), nextFollowUpDraft || null);
    setNoteDraft("");
  }

  function confirmTrial() {
    const option = trialOptions.find((o) => o.id === trialClassId);
    if (!option) return;
    onScheduleTrial(lead.id, option.id, option.nextDate);
    setForm("none");
  }

  function confirmLost() {
    onMarkLost(lead.id, lostReason, lostNote.trim());
    setForm("none");
  }

  function confirmConvert() {
    onConvert(lead.id, planId);
    setForm("none");
  }

  const selectedPlan = membershipPlans.find((p) => p.id === planId);
  const convertedPlan = membershipPlans.find((p) => p.id === lead.convertedPlanId);
  const memberHandoffHref = `/owner/members?prefillName=${encodeURIComponent(lead.name)}&prefillEmail=${encodeURIComponent(lead.email)}&prefillPhone=${encodeURIComponent(lead.phone)}&prefillPlan=${lead.convertedPlanId ?? ""}`;

  return (
    <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{lead.name}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <LeadStatusBadge status={lead.status} />
              <Badge variant="outline">{lead.source}</Badge>
              <span className="text-xs text-muted-foreground">{lead.interest}</span>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-1">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Mail className="size-4 shrink-0" /> {lead.email}
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Phone className="size-4 shrink-0" /> {lead.phone}
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Tag className="size-4 shrink-0" /> Created {formatDate(lead.createdOn)} · Last activity {formatDate(lead.lastActivity)}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assigned to</Label>
            <Select value={lead.assignedTo} onValueChange={(v) => onReassign(lead.id, v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lead.status === "trial-booked" && (
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <CalendarPlus className="size-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">Trial: {getClassLabel(lead.trialClassId)}</p>
                <p className="text-muted-foreground">{lead.trialDate ? formatDate(lead.trialDate) : "—"}</p>
              </div>
            </div>
          )}

          {lead.status === "converted" && (
            <div className="flex items-start gap-2.5 rounded-md border border-success/30 bg-success-tint p-3 text-sm">
              <PartyPopper className="mt-0.5 size-4 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Converted to {convertedPlan?.name ?? "a membership"}</p>
                <p className="text-muted-foreground">{lead.convertedOn ? formatDate(lead.convertedOn) : ""}</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href={memberHandoffHref}>
                    Finish setup in Members
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {lead.status === "lost" && (
            <div className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-tint p-3 text-sm">
              <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />
              <div>
                <p className="font-medium text-foreground">Marked lost — {lead.lostReason}</p>
                <p className="text-muted-foreground">Last activity {formatDate(lead.lastActivity)}</p>
              </div>
            </div>
          )}

          {isActive && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Log an activity</p>
                <Textarea
                  placeholder="Called — left voicemail, will try again tomorrow."
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                />
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor="next-follow-up" className="text-xs text-muted-foreground">Next follow-up</Label>
                  <Input
                    id="next-follow-up"
                    type="date"
                    value={nextFollowUpDraft}
                    min={TODAY}
                    onChange={(e) => setNextFollowUpDraft(e.target.value)}
                  />
                </div>
                <Button size="sm" className="mt-2" onClick={submitActivity} disabled={!noteDraft.trim()}>
                  Log Activity
                </Button>
              </div>
            </>
          )}

          {form === "trial" && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">Schedule a trial</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Class</Label>
                <Select value={trialClassId} onValueChange={setTrialClassId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {trialOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setForm("none")}>Cancel</Button>
                <Button size="sm" onClick={confirmTrial}>Confirm Trial</Button>
              </div>
            </div>
          )}

          {form === "convert" && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">Convert to member</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Membership plan</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {membershipPlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — £{p.price}/{p.billingPeriod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPlan ? `${lead.name} will be marked converted at £${selectedPlan.price}/${selectedPlan.billingPeriod}.` : ""}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setForm("none")}>Cancel</Button>
                <Button size="sm" onClick={confirmConvert}>Confirm Conversion</Button>
              </div>
            </div>
          )}

          {form === "lost" && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">Mark as lost</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <Select value={lostReason} onValueChange={(v) => setLostReason(v as LeadLostReason)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_LOST_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Optional note — e.g. what they said, whether to re-approach later."
                value={lostNote}
                onChange={(e) => setLostNote(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setForm("none")}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={confirmLost}>Confirm Lost</Button>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Activity</p>
            {lead.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              <div className="space-y-3">
                {[...lead.notes].reverse().map((note) => (
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
        </div>

        {isActive && form === "none" && (
          <SheetFooter className="flex-row flex-wrap gap-2 border-t border-border pt-4">
            {(lead.status === "new" || lead.status === "contacted") && (
              <Button variant="outline" size="sm" onClick={() => onMoveToFollowUp(lead.id)}>
                Move to Follow-up
              </Button>
            )}
            {lead.status !== "trial-booked" && lead.status !== "trial-attended" && (
              <Button variant="outline" size="sm" onClick={() => setForm("trial")}>
                <CalendarPlus className="size-3.5" />
                Schedule Trial
              </Button>
            )}
            {lead.status === "trial-booked" && (
              <Button variant="outline" size="sm" onClick={() => onMarkTrialAttended(lead.id)}>
                <CheckCircle2 className="size-3.5" />
                Mark Attended
              </Button>
            )}
            {lead.status === "trial-booked" && (
              <Button variant="outline" size="sm" onClick={() => setForm("trial")}>
                <Dumbbell className="size-3.5" />
                Reschedule
              </Button>
            )}
            <Button size="sm" onClick={() => setForm("convert")}>
              <CheckCircle2 className="size-3.5" />
              Convert to Member
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setForm("lost")}>
              <XCircle className="size-3.5" />
              Mark Lost
            </Button>
          </SheetFooter>
        )}

        {lead.status === "lost" && (
          <SheetFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => onReopen(lead.id)}>
              <RotateCcw className="size-4" />
              Reopen Lead
            </Button>
          </SheetFooter>
        )}
    </SheetContent>
  );
}

export function LeadDetailSheet({ lead, open, onOpenChange, ...rest }: LeadDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {lead && <LeadDetailBody key={lead.id} lead={lead} {...rest} />}
    </Sheet>
  );
}
