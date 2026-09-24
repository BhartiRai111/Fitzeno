"use client";

import * as React from "react";
import { UserRoundPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_SOURCES } from "@/lib/lead-helpers";
import { staffMembers } from "@/lib/data/staff";
import type { LeadSource } from "@/lib/data/types";

const DEFAULT_ASSIGNEES = ["Front Desk", ...staffMembers.map((s) => s.name)];

export interface NewLeadInput {
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  interest: string;
  assignedTo: string;
}

interface AddLeadDialogProps {
  trigger?: React.ReactNode;
  assigneeOptions?: string[];
  onAdd?: (input: NewLeadInput) => void | Promise<void>;
}

export function AddLeadDialog({ trigger, assigneeOptions = DEFAULT_ASSIGNEES, onAdd }: AddLeadDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [source, setSource] = React.useState<LeadSource>("Website");
  const [assignedTo, setAssignedTo] = React.useState(assigneeOptions[0] ?? "Front Desk");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const interest = String(data.get("interest") ?? "").trim();

    setSubmitting(true);
    try {
      await onAdd?.({ name, phone, email, source, interest: interest || "General enquiry", assignedTo });
      setOpen(false);
      form.reset();
      setSource("Website");
      setAssignedTo(assigneeOptions[0] ?? "Front Desk");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <UserRoundPlus className="size-4" />
            Add Lead
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new lead</DialogTitle>
          <DialogDescription>Log an enquiry so it appears in your follow-up pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-name">Full name</Label>
              <Input id="add-lead-name" name="name" placeholder="Jordan Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-phone">Phone</Label>
              <Input id="add-lead-phone" name="phone" type="tel" placeholder="+44 7700 900123" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-lead-email">Email address</Label>
            <Input id="add-lead-email" name="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-interest">Interested in</Label>
              <Input id="add-lead-interest" name="interest" placeholder="Growth plan" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
