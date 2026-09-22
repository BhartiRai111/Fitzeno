"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  QrCode,
  RefreshCw,
  MapPin,
  Clock,
  Flame,
  CalendarDays,
  History,
  LogOut,
  AlertTriangle,
  Ban,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { members } from "@/lib/data/members";
import { attendanceRecords } from "@/lib/data/attendance";
import { gymProfile } from "@/lib/data/gym";
import {
  DEMO_MEMBER_ID,
  TODAY,
  getMemberRecords,
  getVisitsInMonth,
  getCurrentStreak,
  getMembershipBlock,
  getGymOpenState,
  nowTimeLabel,
  minutesBetween,
} from "@/lib/attendance-helpers";
import { formatDate } from "@/lib/utils-data";

type FlowState = "idle" | "success" | "checked-out";

export default function CheckInPage() {
  const member = members.find((m) => m.id === DEMO_MEMBER_ID)!;
  const records = getMemberRecords(attendanceRecords, DEMO_MEMBER_ID);
  const streak = getCurrentStreak(attendanceRecords, DEMO_MEMBER_ID);
  const visitsThisMonth = getVisitsInMonth(attendanceRecords, DEMO_MEMBER_ID);
  const priorVisitToday = records.find((r) => r.date === TODAY);
  const membershipBlock = getMembershipBlock(member.status);
  const gymOpen = getGymOpenState();

  const [flow, setFlow] = React.useState<FlowState>("idle");
  const [submitting, setSubmitting] = React.useState(false);
  const [checkInTime, setCheckInTime] = React.useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = React.useState<string | null>(null);

  const visitNumber = visitsThisMonth + (flow === "idle" ? 0 : 1);

  function handleScan() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setCheckInTime(nowTimeLabel());
      setFlow("success");
    }, 900);
  }

  function handleCheckOut() {
    setCheckOutTime(nowTimeLabel());
    setFlow("checked-out");
  }

  function handleReset() {
    setFlow("idle");
    setCheckInTime(null);
    setCheckOutTime(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Check In" description="Scan at the front desk kiosk, or check in from your phone." />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <MapPin className="size-[18px]" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{gymProfile.locationName}</p>
            <p className="text-xs text-muted-foreground">{gymProfile.address}</p>
          </div>
        </div>
        <Badge variant={gymOpen.open ? "success" : "default"} dot className="w-fit shrink-0">
          {gymOpen.open ? `Open now · Closes ${gymOpen.closesAt}` : `Closed · Opens ${gymOpen.opensAt}`}
        </Badge>
      </Card>

      <Card className="mx-auto flex max-w-sm flex-col items-center gap-4 p-6 text-center">
        {membershipBlock ? (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-danger-tint text-danger">
              <Ban className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{membershipBlock.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{membershipBlock.detail}</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/portal/membership">View Membership</Link>
            </Button>
          </>
        ) : !gymOpen.open ? (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-warning-tint text-warning">
              <Clock className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">
                {gymProfile.name} is currently closed
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check-in opens at {gymOpen.opensAt}. Your class bookings are unaffected.
              </p>
            </div>
          </>
        ) : flow === "success" ? (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
              <CheckCircle2 className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">You&apos;re checked in!</p>
              <p className="mt-1 text-sm text-muted-foreground">Checked in today at {checkInTime}</p>
            </div>
            <div className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
              <Flame className="size-4 text-brand-lime-500" />
              Visit #{visitNumber} this month
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={handleCheckOut}>
                <LogOut className="size-4" />
                Check Out
              </Button>
              <Button asChild className="flex-1">
                <Link href="/portal/classes">Browse Classes</Link>
              </Button>
            </div>
          </>
        ) : flow === "checked-out" ? (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Timer className="size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">See you next time!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {checkInTime} – {checkOutTime}
                {checkInTime && checkOutTime && (
                  <> · {minutesBetween(checkInTime, checkOutTime)} min session</>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="size-4" />
              Check in again
            </Button>
          </>
        ) : (
          <>
            {priorVisitToday && (
              <p className="flex items-start gap-1.5 text-left text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                <span>
                  Already visited today at {priorVisitToday.checkInTime}
                  {priorVisitToday.checkOutTime ? ` · out ${priorVisitToday.checkOutTime}` : " · still at the gym"} —
                  checking in again logs a new visit.
                </span>
              </p>
            )}
            <div
              className="flex size-36 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40"
              role="img"
              aria-label="QR check-in code"
            >
              <QrCode className="size-20 text-foreground" strokeWidth={1} />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-foreground">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.plan} Plan · Active</p>
            </div>
            <Button className="w-full" loading={submitting} onClick={handleScan}>
              {submitting ? "Scanning..." : "Simulate scan & check in"}
            </Button>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Flame className="size-[18px] text-brand-lime-500" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <CalendarDays className="size-[18px]" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular text-foreground">{visitsThisMonth}</p>
            <p className="text-xs text-muted-foreground">Visits this month</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <History className="size-[18px]" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-foreground">
              {records[0] ? formatDate(records[0].date) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Last visit</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="font-display text-sm font-semibold text-foreground">Recent check-ins</p>
        </div>
        {records.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No check-ins yet"
            description="Your visit history will show up here once you check in."
            className="border-0"
          />
        ) : (
          <div className="divide-y divide-border">
            {records.slice(0, 6).map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatDate(record.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {record.checkInTime} – {record.checkOutTime ?? "still at gym"}
                  </p>
                </div>
                <Badge variant="outline">{record.method}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
