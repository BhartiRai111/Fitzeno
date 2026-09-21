"use client";

import * as React from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { gymProfile } from "@/lib/data/gym";

export default function ContactPage() {
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      (event.target as HTMLFormElement).reset();
      toast.success("Message sent", {
        description: "We'll get back to you within 24 hours.",
      });
    }, 800);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contact"
        title="Come see the club for yourself."
        description="Have a question before you join? Send us a message or drop by during opening hours."
        align="center"
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-5">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Full name</Label>
                <Input id="contact-name" placeholder="Jordan Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email address</Label>
                <Input id="contact-email" type="email" placeholder="you@example.com" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input id="contact-subject" placeholder="Question about membership plans" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea id="contact-message" placeholder="How can we help?" rows={5} required />
            </div>
            <Button type="submit" loading={submitting}>
              Send Message
              <Send className="size-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
