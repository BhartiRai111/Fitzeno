"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { gymProfile } from "@/lib/data/gym";

type LegalDoc = "terms" | "privacy";

interface LegalDialogProps {
  doc: LegalDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const content: Record<LegalDoc, { title: string; updated: string; sections: { heading: string; body: string }[] }> = {
  terms: {
    title: "Terms of Service",
    updated: "Last updated 1 September 2026",
    sections: [
      {
        heading: "1. Membership agreement",
        body: `By creating an account with ${gymProfile.name}, you agree to pay membership fees on the schedule for your selected plan and to follow gym facility rules posted at ${gymProfile.locationName}.`,
      },
      {
        heading: "2. Cancellations & freezes",
        body: "You may cancel or freeze your membership at any time from your account. Cancellations take effect at the end of the current billing period; no partial refunds are issued for time already paid.",
      },
      {
        heading: "3. Class bookings",
        body: "Class spots are booked on a first-come basis. Cancelling a booking within the cancellation window releases your spot to members on the waitlist.",
      },
      {
        heading: "4. Facility use",
        body: "Members are expected to use equipment safely, rack weights after use, and follow staff instructions during classes and personal training sessions.",
      },
      {
        heading: "5. Liability",
        body: `${gymProfile.name} is not liable for injury resulting from improper use of equipment or failure to follow posted safety guidance. Members train at their own risk.`,
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated 1 September 2026",
    sections: [
      {
        heading: "1. What we collect",
        body: "We collect the contact and billing details you provide when you join, plus attendance and class-booking activity needed to run your membership.",
      },
      {
        heading: "2. How we use it",
        body: "Your information is used to manage your membership, process payments, send booking and billing notifications, and improve the classes and facilities we offer.",
      },
      {
        heading: "3. Sharing",
        body: `We don't sell member data. Information is only shared with the payment processor needed to bill your membership and, where you opt in, with your assigned trainer.`,
      },
      {
        heading: "4. Your choices",
        body: "You can update your contact details, adjust notification preferences, or request account deletion at any time from your profile.",
      },
      {
        heading: "5. Data retention",
        body: "We keep membership and attendance records for as long as your account is active, and for a limited period afterward as required for billing and legal record-keeping.",
      },
    ],
  },
};

export function LegalDialog({ doc, open, onOpenChange }: LegalDialogProps) {
  const data = content[doc];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{data.title}</DialogTitle>
          <DialogDescription>{data.updated}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1 text-sm text-muted-foreground">
          {data.sections.map((s) => (
            <div key={s.heading}>
              <p className="font-medium text-foreground">{s.heading}</p>
              <p className="mt-1">{s.body}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
