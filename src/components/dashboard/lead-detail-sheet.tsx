"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, Phone, Tag, Calendar, CheckCircle2, XCircle, CalendarPlus } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils-data";
import type { Lead } from "@/lib/data/types";

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const [noteDraft, setNoteDraft] = React.useState("");

  if (!lead) return null;

  function logFollowUp() {
    if (!noteDraft.trim()) return;
    toast.success("Follow-up logged");
    setNoteDraft("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{lead.name}</SheetTitle>
          <SheetDescription>
            <LeadStatusBadge status={lead.status} />
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
              <Tag className="size-4 shrink-0" /> {lead.source} · {lead.interest}
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Calendar className="size-4 shrink-0" />
              Next follow-up: {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : "None scheduled"}
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Log a follow-up</p>
            <Textarea
              placeholder="Called — left voicemail, will try again tomorrow."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
            />
            <Button size="sm" className="mt-2" onClick={logFollowUp} disabled={!noteDraft.trim()}>
              Log Follow-up
            </Button>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Activity</p>
            {lead.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              <div className="space-y-3">
                {lead.notes.map((note) => (
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

        <SheetFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              toast.success(`Trial scheduled for ${lead.name}`);
              onOpenChange(false);
            }}
          >
            <CalendarPlus className="size-4" />
            Schedule Trial
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              toast.success(`${lead.name} marked as converted`);
              onOpenChange(false);
            }}
          >
            <CheckCircle2 className="size-4" />
            Mark Converted
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              toast(`${lead.name} marked as lost`);
              onOpenChange(false);
            }}
          >
            <XCircle className="size-4" />
            Mark Lost
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
