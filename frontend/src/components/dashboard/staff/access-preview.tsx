"use client";

import { Lock, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ownerNavSections } from "@/components/dashboard/nav-config";
import { NAV_AREA_MAP } from "@/lib/permissions";
import type { PermissionArea, PermissionLevel } from "@/lib/data/types";

interface AccessPreviewProps {
  permissions: Record<PermissionArea, PermissionLevel>;
}

export function AccessPreview({ permissions }: AccessPreviewProps) {
  const items = ownerNavSections.flatMap((section) => section.items);

  return (
    <Card className="p-2">
      <nav className="space-y-0.5">
        {items.map((item) => {
          const area = NAV_AREA_MAP[item.href];
          const level: PermissionLevel = area === null || area === undefined ? "manage" : permissions[area];
          const hidden = level === "none";
          const viewOnly = level === "view";

          return (
            <div
              key={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium",
                hidden ? "text-muted-foreground/40" : "text-foreground"
              )}
            >
              <item.icon className={cn("size-[18px] shrink-0", hidden && "opacity-40")} />
              <span className="flex-1 truncate">{item.label}</span>
              {hidden && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                  <Lock className="size-3" />
                  Hidden
                </span>
              )}
              {viewOnly && (
                <span className="flex items-center gap-1 rounded-sm bg-info-tint px-1.5 py-0.5 text-[11px] font-medium text-info">
                  <Eye className="size-3" />
                  View only
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </Card>
  );
}
