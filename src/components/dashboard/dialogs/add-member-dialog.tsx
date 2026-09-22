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

export interface NewMemberInput {
  name: string;
  phone: string;
  email: string;
  dob: string;
  planId: string;
  trainerId?: string;
}

export interface AddMemberDefaults {
  name?: string;
  email?: string;
  phone?: string;
  planId?: string;
  note?: string;
}

interface AddMemberDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: AddMemberDefaults;
  onAdd?: (input: NewMemberInput) => void;
}

export function AddMemberDialog({ trigger, open: controlledOpen, onOpenChange, defaultValues, onAdd }: AddMemberDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [submitting, setSubmitting] = React.useState(false);
  const [trainerId, setTrainerId] = React.useState<string>("none");
  const [planId, setPlanId] = React.useState(defaultValues?.planId || membershipPlans[1]?.id);

  function resetSelects() {
    setPlanId(defaultValues?.planId || membershipPlans[1]?.id);
    setTrainerId("none");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const phone = String(form.get("phone") ?? "");
    const email = String(form.get("email") ?? "");
    const dob = String(form.get("dob") ?? "");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      onAdd?.({ name, phone, email, dob, planId: planId ?? membershipPlans[0].id, trainerId: trainerId === "none" ? undefined : trainerId });
      toast.success("Member added", {
        description: `${name || "New member"} has been added to Fitzeno.`,
      });
      (event.target as HTMLFormElement).reset();
      resetSelects();
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
          <DialogDescription>
            {defaultValues?.note ?? "Create a member profile and assign a plan."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={defaultValues?.name ?? "blank"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-member-name">Full name</Label>
              <Input id="add-member-name" name="name" defaultValue={defaultValues?.name} placeholder="Jordan Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-member-phone">Phone</Label>
              <Input id="add-member-phone" name="phone" type="tel" defaultValue={defaultValues?.phone} placeholder="+44 7700 900123" required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-member-email">Email address</Label>
              <Input id="add-member-email" name="email" type="email" defaultValue={defaultValues?.email} placeholder="you@example.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-member-dob">Date of birth</Label>
              <Input id="add-member-dob" name="dob" type="date" required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Membership plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
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
              <Select value={trainerId} onValueChange={setTrainerId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetSelects(); }}>
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
