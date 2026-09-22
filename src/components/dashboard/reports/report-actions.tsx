"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { buildCsv, downloadCsv, countCsvRows, slugifyFilename, type CsvSection } from "@/lib/export-helpers";
import { gymProfile } from "@/lib/data/gym";
import { TODAY } from "@/lib/booking-helpers";
import { formatDate } from "@/lib/utils-data";

interface ReportActionsProps {
  reportLabel: string;
  scopeLabel: string;
  sections: CsvSection[];
  emptyReason?: string;
  className?: string;
}

export function ReportActions({ reportLabel, scopeLabel, sections, emptyReason, className }: ReportActionsProps) {
  const [exportState, setExportState] = React.useState<"idle" | "preparing">("idle");
  const rowCount = countCsvRows(sections);
  const hasData = rowCount > 0;
  const generatedLabel = `${formatDate(TODAY)} · ${gymProfile.locationName}`;

  function handleExport() {
    if (!hasData || exportState === "preparing") return;
    setExportState("preparing");
    window.setTimeout(() => {
      const csv = buildCsv({ reportLabel, scopeLabel, generatedLabel, sections });
      const filename = `${slugifyFilename("fitzeno", reportLabel, TODAY)}.csv`;
      downloadCsv(filename, csv);
      setExportState("idle");
      toast.success("Export ready", {
        description: `${filename} · ${rowCount} row${rowCount === 1 ? "" : "s"}`,
      });
    }, 500);
  }

  function handlePrint() {
    if (!hasData) {
      toast.error("Nothing to print", {
        description: emptyReason ?? "There's no data in this report yet.",
      });
      return;
    }
    toast.message("Preparing print view…", { description: `${reportLabel} · ${scopeLabel}` });
    window.setTimeout(() => window.print(), 200);
  }

  return (
    <div className={cn("flex items-center gap-2 no-print", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={hasData ? -1 : 0}>
            <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={!hasData || exportState === "preparing"}>
              {exportState === "preparing" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exportState === "preparing" ? "Preparing…" : "Export CSV"}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {hasData
            ? `Downloads ${reportLabel} for ${scopeLabel} as a CSV file (${rowCount} row${rowCount === 1 ? "" : "s"}).`
            : emptyReason ?? "No data available to export for this view."}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={hasData ? -1 : 0}>
            <Button type="button" variant="outline" size="sm" onClick={handlePrint} disabled={!hasData}>
              <Printer className="size-4" />
              Print
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {hasData
            ? `Opens a print-friendly view of ${reportLabel} for ${scopeLabel}.`
            : emptyReason ?? "No data available to print for this view."}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Metadata block that's invisible on screen and only rendered when the page is printed. */
export function PrintReportHeader({ reportLabel, scopeLabel }: { reportLabel: string; scopeLabel: string }) {
  return (
    <div className="print-only mb-4">
      <p className="font-display text-lg font-bold text-foreground">{gymProfile.locationName}</p>
      <p className="text-base font-semibold text-foreground">{reportLabel}</p>
      <p className="text-sm text-muted-foreground">
        {scopeLabel} · Generated {formatDate(TODAY)}
      </p>
      <div className="mt-2 border-b border-border" />
    </div>
  );
}
