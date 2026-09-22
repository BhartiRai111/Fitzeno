"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { members } from "@/lib/data/members";
import { trainers } from "@/lib/data/trainers";
import { staffMembers } from "@/lib/data/staff";
import { gymProfile } from "@/lib/data/gym";
import { TODAY } from "@/lib/booking-helpers";
import type { NotificationPriority, SentAnnouncement } from "@/lib/data/types";

interface SendNotificationDialogProps {
  trigger?: React.ReactNode;
  onSent?: (announcement: SentAnnouncement) => void;
}

const sampleTotal = members.length;
const scaleFactor = gymProfile.memberCount / sampleTotal;
function estimateMembers(sampleCount: number) {
  return Math.max(1, Math.round(sampleCount * scaleFactor));
}

const audienceOptions = [
  { value: "all", label: "All members", count: gymProfile.memberCount },
  { value: "active", label: "Active members", count: estimateMembers(members.filter((m) => m.status === "active").length) },
  { value: "expiring", label: "Members expiring soon", count: estimateMembers(members.filter((m) => m.status === "expiring").length) },
  { value: "growth", label: "Growth plan members", count: estimateMembers(members.filter((m) => m.plan === "Growth").length) },
  { value: "elite", label: "Elite plan members", count: estimateMembers(members.filter((m) => m.plan === "Elite").length) },
  { value: "trainers", label: "All trainers", count: trainers.length },
  { value: "staff", label: "Front desk staff", count: staffMembers.filter((s) => s.role.includes("Front Desk")).length },
  { value: "trainers-staff", label: "All trainers & staff", count: trainers.length + staffMembers.length },
] as const;

const priorityOptions: { value: NotificationPriority; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "FYI — no rush to read." },
  { value: "medium", label: "Normal", description: "Standard update." },
  { value: "high", label: "Important", description: "Time-sensitive — flagged for attention." },
];

export function SendNotificationDialog({ trigger, onSent }: SendNotificationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [audience, setAudience] = React.useState<(typeof audienceOptions)[number]["value"]>("all");
  const [priority, setPriority] = React.useState<NotificationPriority>("medium");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");

  const selectedAudience = audienceOptions.find((a) => a.value === audience) ?? audienceOptions[0];

  function resetForm() {
    setAudience("all");
    setPriority("medium");
    setTitle("");
    setMessage("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      const announcement: SentAnnouncement = {
        id: `sa-${Date.now()}`,
        title: title.trim() || "Gym announcement",
        message: message.trim(),
        audienceLabel: selectedAudience.label,
        recipientCount: selectedAudience.count,
        priority,
        sentBy: "Sam Carter",
        sentOn: TODAY,
      };
      onSent?.(announcement);
      toast.success("Announcement sent", {
        description: `Delivered to ~${selectedAudience.count.toLocaleString()} recipient${selectedAudience.count === 1 ? "" : "s"} (${selectedAudience.label}).`,
      });
      resetForm();
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Megaphone className="size-4" />
            Send Notification
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send an announcement</DialogTitle>
          <DialogDescription>Notify members, trainers, or staff about updates, offers, or schedule changes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audienceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              ~{selectedAudience.count.toLocaleString()} recipient{selectedAudience.count === 1 ? "" : "s"} will receive this.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notification-title">Title</Label>
            <Input
              id="notification-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Friday early close"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notification-message">Message</Label>
            <Textarea
              id="notification-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="We'll be closing early at 6pm this Friday for maintenance."
              rows={4}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as NotificationPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — {opt.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Channels</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="channel-inapp" defaultChecked />
              <Label htmlFor="channel-inapp" className="font-normal">In-app notification</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="channel-email" defaultChecked />
              <Label htmlFor="channel-email" className="font-normal">Email</Label>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Send Announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
