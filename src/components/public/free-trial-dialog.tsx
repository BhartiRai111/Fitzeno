"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2 } from "lucide-react";
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
import { formatDate } from "@/lib/utils-data";

interface FreeTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timeSlots = ["7:00 AM", "9:00 AM", "12:30 PM", "5:30 PM", "6:30 PM", "7:30 PM"];

export function FreeTrialDialog({ open, onOpenChange }: FreeTrialDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [submitting, setSubmitting] = React.useState(false);
  const [time, setTime] = React.useState(timeSlots[1]);
  const [submitted, setSubmitted] = React.useState<{ name: string; date: string; time: string } | null>(null);

  React.useEffect(() => {
    // Intentional: reset the flow each time this dialog reopens.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitted(null);
      setTime(timeSlots[1]);
    }
  }, [open]);

  const Header = isDesktop ? DialogHeader : SheetHeader;
  const Title = isDesktop ? DialogTitle : SheetTitle;
  const Description = isDesktop ? DialogDescription : SheetDescription;
  const Footer = isDesktop ? DialogFooter : SheetFooter;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = (form.elements.namedItem("trial-name") as HTMLInputElement).value;
    const date = (form.elements.namedItem("trial-date") as HTMLInputElement).value;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted({ name, date, time });
    }, 900);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} contentClassName="sm:max-w-md">
      {submitted ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
            <CheckCircle2 className="size-9" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">
              You&apos;re booked in, {submitted.name.split(" ")[0] || "there"}!
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your free trial is held for{" "}
              <span className="font-medium text-foreground">
                {submitted.date ? formatDate(submitted.date) : "your requested date"}
              </span>{" "}
              at <span className="font-medium text-foreground">{submitted.time}</span>. A coach will
              call to confirm — usually within a few hours.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button asChild className="flex-1">
              <Link href="/register" onClick={() => onOpenChange(false)}>
                Join Now Instead
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
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
                <Input id="trial-name" name="trial-name" placeholder="Jordan Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trial-phone">Phone number</Label>
                <Input id="trial-phone" name="trial-phone" type="tel" placeholder="+44 7700 900123" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trial-email">Email address</Label>
              <Input id="trial-email" name="trial-email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="trial-date">Preferred date</Label>
                <Input id="trial-date" name="trial-date" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trial-time">Preferred time</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger id="trial-time">
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
        </>
      )}
    </ResponsiveDialog>
  );
}
