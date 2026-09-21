"use client";

import * as React from "react";
import { CalendarCheck2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
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
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

interface FreeTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timeSlots = ["7:00 AM", "9:00 AM", "12:30 PM", "5:30 PM", "6:30 PM", "7:30 PM"];

export function FreeTrialDialog({ open, onOpenChange }: FreeTrialDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [submitting, setSubmitting] = React.useState(false);
  const Header = isDesktop ? DialogHeader : SheetHeader;
  const Title = isDesktop ? DialogTitle : SheetTitle;
  const Description = isDesktop ? DialogDescription : SheetDescription;
  const Footer = isDesktop ? DialogFooter : SheetFooter;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast.success("Trial booked!", {
        description: "Check your email for confirmation. We'll see you at the gym.",
      });
    }, 900);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} contentClassName="sm:max-w-md">
      <Header>
        <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <CalendarCheck2 className="size-5" />
        </div>
        <Title>Book your free trial</Title>
        <Description>No card required. Pick a time and we&apos;ll hold your spot.</Description>
      </Header>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trial-name">Full name</Label>
            <Input id="trial-name" placeholder="Jordan Smith" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trial-phone">Phone number</Label>
            <Input id="trial-phone" type="tel" placeholder="+44 7700 900123" required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trial-email">Email address</Label>
          <Input id="trial-email" type="email" placeholder="you@example.com" required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trial-date">Preferred date</Label>
            <Input id="trial-date" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label>Preferred time</Label>
            <Select defaultValue={timeSlots[1]}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Footer className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button type="submit" loading={submitting}>
            Confirm trial booking
          </Button>
        </Footer>
      </form>
    </ResponsiveDialog>
  );
}
