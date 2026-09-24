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
import { useMembershipPlans } from "@/hooks/use-membership-plans";
import { useAudienceCount, useSendAnnouncement } from "@/hooks/use-announcements";
import type { BackendAnnouncementAudience } from "@/lib/api/announcements";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { NotificationPriority } from "@/lib/data/types";

interface SendNotificationDialogProps {
  trigger?: React.ReactNode;
}

type AudienceValue = Exclude<BackendAnnouncementAudience, "PLAN_MEMBERS" | "SPECIFIC_MEMBERS"> | `PLAN:${string}`;

const priorityOptions: { value: NotificationPriority; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "FYI — no rush to read." },
  { value: "medium", label: "Normal", description: "Standard update." },
  { value: "high", label: "Important", description: "Time-sensitive — flagged for attention." },
];

const PRIORITY_TO_BACKEND: Record<NotificationPriority, "LOW" | "MEDIUM" | "HIGH"> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

function AudienceCountLabel({ audience, planId }: { audience: BackendAnnouncementAudience; planId?: string }) {
  const { data: count, isLoading } = useAudienceCount(audience, planId);
  return (
    <p className="text-xs text-muted-foreground">
      {isLoading ? "Calculating recipients..." : `~${(count ?? 0).toLocaleString()} recipient${count === 1 ? "" : "s"} will receive this.`}
    </p>
  );
}

export function SendNotificationDialog({ trigger }: SendNotificationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [audienceValue, setAudienceValue] = React.useState<AudienceValue>("ALL_MEMBERS");
  const [priority, setPriority] = React.useState<NotificationPriority>("medium");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const { plans } = useMembershipPlans();
  const sendAnnouncement = useSendAnnouncement();

  const isPlanAudience = audienceValue.startsWith("PLAN:");
  const audience: BackendAnnouncementAudience = isPlanAudience ? "PLAN_MEMBERS" : (audienceValue as BackendAnnouncementAudience);
  const planId = isPlanAudience ? audienceValue.slice(5) : undefined;

  function resetForm() {
    setAudienceValue("ALL_MEMBERS");
    setPriority("medium");
    setTitle("");
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await sendAnnouncement.mutateAsync({
        title: title.trim() || "Gym announcement",
        message: message.trim(),
        priority: PRIORITY_TO_BACKEND[priority],
        audience,
        planId,
      });
      setOpen(false);
      toast.success("Announcement sent", {
        description: `Delivered to ~${result.recipientCount.toLocaleString()} recipient${result.recipientCount === 1 ? "" : "s"}.`,
      });
      resetForm();
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof NetworkError ? err.message : "Couldn't send this announcement.");
    } finally {
      setSubmitting(false);
    }
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
            <Select value={audienceValue} onValueChange={(v) => setAudienceValue(v as AudienceValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_MEMBERS">All members</SelectItem>
                <SelectItem value="ACTIVE_MEMBERS">Active members</SelectItem>
                <SelectItem value="EXPIRING_MEMBERS">Members expiring soon</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={`PLAN:${plan.id}`}>{plan.name} plan members</SelectItem>
                ))}
                <SelectItem value="ALL_TRAINERS">All trainers</SelectItem>
                <SelectItem value="ALL_STAFF">All staff</SelectItem>
                <SelectItem value="TRAINERS_AND_STAFF">All trainers & staff</SelectItem>
              </SelectContent>
            </Select>
            {open && <AudienceCountLabel audience={audience} planId={planId} />}
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
              <Checkbox id="channel-inapp" checked disabled />
              <Label htmlFor="channel-inapp" className="font-normal">In-app notification</Label>
            </div>
            <p className="text-xs text-muted-foreground/70">Email delivery isn&apos;t connected yet — announcements are in-app only for now.</p>
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
