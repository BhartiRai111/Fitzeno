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
import { Textarea } from "@/components/ui/textarea";

export function AddTrainerDialog({ trigger }: { trigger?: React.ReactNode }) {
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
      toast.success("Trainer added", { description: `${name || "New trainer"} can now be assigned to classes.` });
      (event.target as HTMLFormElement).reset();
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="size-4" />
            Add Trainer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a trainer</DialogTitle>
          <DialogDescription>Create a coach profile for the schedule and public trainer page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trainer-name">Full name</Label>
              <Input id="trainer-name" name="name" placeholder="Jordan Ellis" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trainer-role">Role / title</Label>
              <Input id="trainer-role" name="role" placeholder="Personal Trainer" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trainer-specialties">Specialties (comma separated)</Label>
            <Input id="trainer-specialties" name="specialties" placeholder="HIIT, Nutrition Coaching" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trainer-bio">Bio</Label>
            <Textarea id="trainer-bio" name="bio" placeholder="A short public bio for the trainer page." rows={3} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Trainer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
