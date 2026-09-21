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
import { membershipPlans } from "@/lib/data/plans";
import { trainers } from "@/lib/data/trainers";

interface AddMemberDialogProps {
  trigger?: React.ReactNode;
}

export function AddMemberDialog({ trigger }: AddMemberDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      toast.success("Member added", {
        description: `${name || "New member"} has been added to Fitzeno.`,
      });
      (event.target as HTMLFormElement).reset();
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="size-4" />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new member</DialogTitle>
          <DialogDescription>Create a member profile and assign a plan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-member-name">Full name</Label>
              <Input id="add-member-name" name="name" placeholder="Jordan Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-member-phone">Phone</Label>
              <Input id="add-member-phone" name="phone" type="tel" placeholder="+44 7700 900123" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-member-email">Email address</Label>
            <Input id="add-member-email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Membership plan</Label>
              <Select defaultValue={membershipPlans[1]?.id}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {membershipPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} — £{plan.price}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned trainer (optional)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
