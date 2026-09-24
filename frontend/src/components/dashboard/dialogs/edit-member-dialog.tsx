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
import { useTrainersRoster } from "@/hooks/use-trainers";
import { useUpdateMember } from "@/hooks/use-members";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { Member } from "@/lib/data/types";

interface EditMemberDialogProps {
  member: Member;
  trigger?: React.ReactNode;
}

export function EditMemberDialog({ member, trigger }: EditMemberDialogProps) {
  const [open, setOpenState] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [trainerId, setTrainerId] = React.useState(member.trainerId ?? "none");
  const { trainers } = useTrainersRoster();
  const updateMember = useUpdateMember();

  function setOpen(next: boolean) {
    if (next) setTrainerId(member.trainerId ?? "none");
    setOpenState(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const [firstName, ...rest] = name.split(/\s+/);
    const lastName = rest.join(" ") || firstName;
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    setSubmitting(true);
    try {
      await updateMember.mutateAsync({
        id: member.id,
        input: {
          firstName,
          lastName,
          phone: phone || undefined,
          email: email || undefined,
          trainerId: trainerId === "none" ? null : trainerId,
        },
      });
      setOpen(false);
      toast.success("Member details updated");
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Couldn't update this member.");
    } finally {
      setSubmitting(false);
    }
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
          <div className="space-y-1.5">
            <Label>Assigned trainer</Label>
            <Select value={trainerId} onValueChange={setTrainerId}>
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
            <p className="text-xs text-muted-foreground">To change their membership plan, use Renew from the member&apos;s profile.</p>
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
