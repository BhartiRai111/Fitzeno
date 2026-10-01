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
import { useTrainersRoster } from "@/hooks/use-trainers";
import { daysOfWeek } from "@/lib/data/classes";
import { useCreateClassSeries, useUpdateClassSeries, type CreateClassInput } from "@/hooks/use-classes";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { GymClass } from "@/lib/data/types";

interface ClassDialogProps {
  gymClass?: GymClass;
  trigger?: React.ReactNode;
}

export function ClassDialog({ gymClass, trigger }: ClassDialogProps) {
  const { trainers } = useTrainersRoster();
  const [open, setOpen] = React.useState(false);
  const [trainerId, setTrainerId] = React.useState(gymClass?.trainerId ?? trainers[0]?.id ?? "");
  const [day, setDay] = React.useState<GymClass["day"]>(gymClass?.day ?? "Mon");
  const [startTime, setStartTime] = React.useState(gymClass?.startTime ?? "09:00");
  const [duration, setDuration] = React.useState(gymClass?.duration ?? 45);
  const isEdit = !!gymClass;

  const createSeries = useCreateClassSeries();
  const updateSeries = useUpdateClassSeries();
  const submitting = createSeries.isPending || updateSeries.isPending;

  React.useEffect(() => {
    // Intentional: reset the form to the target class's values each time this dialog reopens.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setTrainerId(gymClass?.trainerId ?? trainers[0]?.id ?? "");
      setDay(gymClass?.day ?? "Mon");
      setStartTime(gymClass?.startTime ?? "09:00");
      setDuration(gymClass?.duration ?? 45);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trainers]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: CreateClassInput = {
      name: String(form.get("name") ?? "").trim(),
      type: String(form.get("type") ?? "").trim(),
      trainerId,
      day,
      startTime,
      duration,
      capacity: Number(form.get("capacity")) || 1,
      location: String(form.get("location") ?? "").trim(),
    };

    try {
      if (isEdit) {
        await updateSeries.mutateAsync({ id: gymClass.id, input });
      } else {
        await createSeries.mutateAsync(input);
      }
      setOpen(false);
      toast.success(isEdit ? "Class updated" : "Class created");
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : `Couldn't ${isEdit ? "update" : "create"} this class. Please try again.`
      );
    }
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
              <Label htmlFor="class-type">Type</Label>
              <Input id="class-type" name="type" defaultValue={gymClass?.type} placeholder="HIIT" required />
            </div>
            <div className="space-y-1.5">
              <Label>Trainer</Label>
              <Select value={trainerId} onValueChange={setTrainerId} disabled={trainers.length === 0}>
                <SelectTrigger><SelectValue placeholder="No trainers yet" /></SelectTrigger>
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
              <Select value={day} onValueChange={(v) => setDay(v as GymClass["day"])}>
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
              <Input
                id="class-time"
                name="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-duration">Duration (min)</Label>
              <Input
                id="class-duration"
                name="duration"
                type="number"
                min="15"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
                required
              />
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
            <Button type="submit" loading={submitting} disabled={!trainerId}>
              {isEdit ? "Save Changes" : "Create Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
