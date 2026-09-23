"use client";

import * as React from "react";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { gymProfile } from "@/lib/data/gym";

export function ContactPageClient() {
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<{ name: string; subject: string } | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = (form.elements.namedItem("contact-name") as HTMLInputElement).value;
    const subject = (form.elements.namedItem("contact-subject") as HTMLInputElement).value;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted({ name, subject });
    }, 800);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{gymProfile.locationName}</p>
              <p className="text-sm text-muted-foreground">{gymProfile.address}</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">{gymProfile.phone}</p>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">{gymProfile.email}</p>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-0.5 text-sm text-muted-foreground">
              {gymProfile.hours.map((h) => (
                <p key={h.day}>
                  <span className="text-foreground">{h.day}:</span> {h.time}
                </p>
              ))}
            </div>
          </div>
        </Card>
        <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted/50 text-sm text-muted-foreground">
          Map preview — {gymProfile.locationName}
        </div>
      </div>

      <Card className="p-6 lg:col-span-3">
        {submitted ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
              <CheckCircle2 className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">
                Thanks, {submitted.name.split(" ")[0] || "there"} — message sent.
              </p>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Your note about &ldquo;{submitted.subject || "your enquiry"}&rdquo; has reached our
                front desk team. We&apos;ll reply within 24 hours.
              </p>
            </div>
            <Button variant="outline" onClick={() => setSubmitted(null)}>
              Send another message
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Full name</Label>
                <Input id="contact-name" name="contact-name" placeholder="Jordan Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email address</Label>
                <Input id="contact-email" name="contact-email" type="email" placeholder="you@example.com" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input id="contact-subject" name="contact-subject" placeholder="Question about membership plans" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea id="contact-message" name="contact-message" placeholder="How can we help?" rows={5} required />
            </div>
            <Button type="submit" loading={submitting}>
              Send Message
              <Send className="size-4" />
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
