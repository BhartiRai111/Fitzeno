"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PermissionLevelToggle } from "@/components/dashboard/staff/permission-level-toggle";
import { PERMISSION_AREAS, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import type { PermissionArea, PermissionLevel, StaffAccessRole } from "@/lib/data/types";

const EDITABLE_ROLES: StaffAccessRole[] = ["manager", "trainer", "front-desk"];

interface PermissionMatrixProps {
  permissions: Record<StaffAccessRole, Record<PermissionArea, PermissionLevel>>;
  onChange: (role: StaffAccessRole, area: PermissionArea, level: PermissionLevel) => void;
}

export function PermissionMatrix({ permissions, onChange }: PermissionMatrixProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">
                <div className="flex items-center gap-1.5">
                  {ROLE_LABELS.owner}
                  <Badge variant="outline" className="normal-case">Locked</Badge>
                </div>
              </th>
              {EDITABLE_ROLES.map((role) => (
                <th key={role} className="px-4 py-3 font-medium">{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_AREAS.map((area) => (
              <tr key={area.key} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <area.icon className="size-3.5" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{area.label}</p>
                      <p className="text-xs text-muted-foreground">{area.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <PermissionLevelToggle value="manage" onChange={() => {}} disabled aria-label={`Owner access to ${area.label}`} />
                </td>
                {EDITABLE_ROLES.map((role) => (
                  <td key={role} className="px-4 py-3">
                    <PermissionLevelToggle
                      value={permissions[role][area.key]}
                      onChange={(level) => onChange(role, area.key, level)}
                      aria-label={`${ROLE_LABELS[role]} access to ${area.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["owner", ...EDITABLE_ROLES] as StaffAccessRole[]).map((role) => (
          <div key={role}>
            <p className="text-xs font-semibold text-foreground">{ROLE_LABELS[role]}</p>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
