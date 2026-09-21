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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SendNotificationDialogProps {
  trigger?: React.ReactNode;
}

export function SendNotificationDialog({ trigger }: SendNotificationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      toast.success("Announcement sent");
      (event.target as HTMLFormElement).reset();
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
          <DialogDescription>Notify members about updates, offers, or schedule changes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                <SelectItem value="active">Active members</SelectItem>
                <SelectItem value="expiring">Expiring soon</SelectItem>
                <SelectItem value="growth">Growth plan members</SelectItem>
                <SelectItem value="elite">Elite plan members</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notification-message">Message</Label>
            <Textarea
              id="notification-message"
              name="message"
              placeholder="We'll be closing early at 6pm this Friday for maintenance."
              rows={4}
              required
            />
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
