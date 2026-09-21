"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import type { Member } from "@/lib/data/types";

interface EditMemberDialogProps {
  member: Member;
  trigger?: React.ReactNode;
}

export function EditMemberDialog({ member, trigger }: EditMemberDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      toast.success("Member details updated");
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>Update {member.name}&apos;s profile details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-member-name">Full name</Label>
              <Input id="edit-member-name" name="name" defaultValue={member.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-member-phone">Phone</Label>
              <Input id="edit-member-phone" name="phone" defaultValue={member.phone} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-member-email">Email address</Label>
            <Input id="edit-member-email" name="email" type="email" defaultValue={member.email} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Membership plan</Label>
              <Select defaultValue={membershipPlans.find((p) => p.name === member.plan)?.id ?? membershipPlans[0].id}>
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
              <Label>Assigned trainer</Label>
              <Select defaultValue={member.trainerId ?? "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
