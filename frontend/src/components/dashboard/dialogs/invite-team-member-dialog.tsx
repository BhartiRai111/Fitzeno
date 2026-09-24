"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import type { StaffAccessRole } from "@/lib/data/types";

export type InvitableRole = Exclude<StaffAccessRole, "owner">;

export interface NewTeamMemberInput {
  name: string;
  email: string;
  accessRole: InvitableRole;
  title: string;
  specialties?: string;
}

const INVITABLE_ROLES: InvitableRole[] = ["manager", "front-desk", "trainer"];

interface InviteTeamMemberDialogProps {
  trigger?: React.ReactNode;
  onInvite: (input: NewTeamMemberInput) => void;
}

export function InviteTeamMemberDialog({ trigger, onInvite }: InviteTeamMemberDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [role, setRole] = React.useState<InvitableRole>("front-desk");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const specialties = String(form.get("specialties") ?? "").trim();

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      onInvite({
        name,
        email,
        accessRole: role,
        title: title || (role === "trainer" ? "Trainer" : ROLE_LABELS[role]),
        specialties: role === "trainer" ? specialties : undefined,
      });
      toast.success("Invite sent", { description: `An invite email was sent to ${email}.` });
      (event.target as HTMLFormElement).reset();
      setRole("front-desk");
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="size-4" />
            Invite Team Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>Send an invite so they can log in and access the dashboard.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name</Label>
              <Input id="invite-name" name="name" placeholder="Jordan Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input id="invite-email" name="email" type="email" placeholder="you@example.com" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InvitableRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-title">{role === "trainer" ? "Coaching title" : "Job title"}</Label>
            <Input
              id="invite-title"
              name="title"
              placeholder={role === "trainer" ? "Personal Trainer" : role === "manager" ? "General Manager" : "Front Desk"}
            />
          </div>

          {role === "trainer" && (
            <div className="space-y-1.5">
              <Label htmlFor="invite-specialties">Specialties (comma separated)</Label>
              <Input id="invite-specialties" name="specialties" placeholder="HIIT, Nutrition Coaching" required />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
