"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { trainers } from "@/lib/data/trainers";
import { daysOfWeek } from "@/lib/data/classes";
import type { GymClass } from "@/lib/data/types";

const classTypes: GymClass["type"][] = ["HIIT", "Yoga", "Strength", "Spin", "Boxing", "Mobility", "Pilates"];

interface ClassDialogProps {
  gymClass?: GymClass;
  trigger?: React.ReactNode;
}

export function ClassDialog({ gymClass, trigger }: ClassDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const isEdit = !!gymClass;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      toast.success(isEdit ? "Class updated" : "Class created");
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" />
            Create Class
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit class" : "Create a class"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update details for ${gymClass?.name}.` : "Add a new class to the weekly timetable."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name">Class name</Label>
            <Input id="class-name" name="name" defaultValue={gymClass?.name} placeholder="Power Hour HIIT" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue={gymClass?.type ?? "HIIT"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Trainer</Label>
              <Select defaultValue={gymClass?.trainerId ?? trainers[0].id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select defaultValue={gymClass?.day ?? "Mon"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-time">Start time</Label>
              <Input id="class-time" name="startTime" type="time" defaultValue={gymClass?.startTime ?? "09:00"} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-duration">Duration (min)</Label>
              <Input id="class-duration" name="duration" type="number" min="15" step="5" defaultValue={gymClass?.duration ?? 45} required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="class-capacity">Capacity</Label>
              <Input id="class-capacity" name="capacity" type="number" min="1" defaultValue={gymClass?.capacity ?? 16} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-location">Location</Label>
              <Input id="class-location" name="location" defaultValue={gymClass?.location} placeholder="Studio A" required />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save Changes" : "Create Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
