"use client";

import * as React from "react";
import { CheckCircle2, QrCode, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CheckInPage() {
  const [checkedIn, setCheckedIn] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Check In" description="Show this code at the front desk scanner to check in." />

      <Card className="mx-auto flex max-w-sm flex-col items-center gap-5 p-8 text-center">
        {checkedIn ? (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
              <CheckCircle2 className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">You&apos;re checked in!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Checked in today at {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCheckedIn(false)}>
              <RefreshCw className="size-4" />
              Check in again
            </Button>
          </>
        ) : (
          <>
            <div
              className="flex size-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40"
              role="img"
              aria-label="QR check-in code"
            >
              <QrCode className="size-28 text-foreground" strokeWidth={1} />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-foreground">Aisha Patel</p>
              <p className="text-sm text-muted-foreground">Growth Plan · Active</p>
            </div>
            <Button className="w-full" onClick={() => setCheckedIn(true)}>
              Simulate scan &amp; check in
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
