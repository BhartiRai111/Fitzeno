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

export function InviteStaffDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      toast.success("Invite sent", { description: `An invite email was sent to ${email}.` });
      (event.target as HTMLFormElement).reset();
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="size-4" />
            Invite Staff
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a staff member</DialogTitle>
          <DialogDescription>Send an invite so they can log in and access the dashboard.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input id="invite-name" name="name" placeholder="Jordan Smith" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input id="invite-email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select defaultValue="Front Desk">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Front Desk">Front Desk</SelectItem>
                <SelectItem value="Front Desk / Sales">Front Desk / Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
