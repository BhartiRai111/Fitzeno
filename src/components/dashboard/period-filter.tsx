"use client";

import * as React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DateRange, PeriodPreset } from "@/lib/reports-helpers";
import { PERIOD_PRESET_LABELS, formatRangeLabel } from "@/lib/reports-helpers";

const QUICK_PRESETS: Exclude<PeriodPreset, "custom">[] = ["today", "week", "month", "last-month"];

interface PeriodFilterProps {
  preset: PeriodPreset;
  customRange?: DateRange;
  maxDate: string;
  onChange: (preset: PeriodPreset, customRange?: DateRange) => void;
}

export function PeriodFilter({ preset, customRange, maxDate, onChange }: PeriodFilterProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [draftStart, setDraftStart] = React.useState(customRange?.start ?? maxDate);
  const [draftEnd, setDraftEnd] = React.useState(customRange?.end ?? maxDate);

  function handleOpenChange(open: boolean) {
    if (open) {
      setDraftStart(customRange?.start ?? maxDate);
      setDraftEnd(customRange?.end ?? maxDate);
    }
    setPopoverOpen(open);
  }

  const invalidRange = draftStart > draftEnd;

  function applyCustomRange() {
    if (invalidRange) return;
    onChange("custom", { start: draftStart, end: draftEnd });
    setPopoverOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {QUICK_PRESETS.map((p) => (
        <Button
          key={p}
          type="button"
          size="sm"
          variant={preset === p ? "primary" : "outline"}
          onClick={() => onChange(p)}
        >
          {PERIOD_PRESET_LABELS[p]}
        </Button>
      ))}
      <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant={preset === "custom" ? "primary" : "outline"}>
            <Calendar className="size-3.5" />
            {preset === "custom" && customRange ? formatRangeLabel(customRange) : "Custom range"}
            <ChevronDown className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <p className="mb-3 text-sm font-semibold text-foreground">Choose a date range</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="period-start">Start date</Label>
              <Input
                id="period-start"
                type="date"
                value={draftStart}
                max={maxDate}
                onChange={(e) => setDraftStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-end">End date</Label>
              <Input
                id="period-end"
                type="date"
                value={draftEnd}
                max={maxDate}
                onChange={(e) => setDraftEnd(e.target.value)}
              />
            </div>
          </div>
          {invalidRange && (
            <p className="mt-2 text-xs font-medium text-danger">End date must be on or after the start date.</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPopoverOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={applyCustomRange} disabled={invalidRange}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function PeriodFilterSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 w-20 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
