"use client";

import { cn } from "@/lib/utils";
import { PERMISSION_LEVEL_LABELS } from "@/lib/permissions";
import type { PermissionLevel } from "@/lib/data/types";

const LEVELS: PermissionLevel[] = ["none", "view", "manage"];

const LEVEL_ACTIVE_CLASS: Record<PermissionLevel, string> = {
  none: "bg-muted text-foreground",
  view: "bg-info-tint text-info",
  manage: "bg-success-tint text-success",
};

const LEVEL_SHORT_LABEL: Record<PermissionLevel, string> = {
  none: "None",
  view: "View",
  manage: "Manage",
};

interface PermissionLevelToggleProps {
  value: PermissionLevel;
  onChange: (level: PermissionLevel) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function PermissionLevelToggle({ value, onChange, disabled, ...props }: PermissionLevelToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-md border border-border bg-card p-0.5",
        disabled && "opacity-60"
      )}
      role="group"
      aria-label={props["aria-label"]}
    >
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level)}
          title={PERMISSION_LEVEL_LABELS[level]}
          aria-pressed={value === level}
          className={cn(
            "rounded-sm px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed",
            value === level ? LEVEL_ACTIVE_CLASS[level] : "text-muted-foreground hover:bg-muted"
          )}
        >
          {LEVEL_SHORT_LABEL[level]}
        </button>
      ))}
    </div>
  );
}
