"use client";

import * as React from "react";
import { Mail, Phone, CalendarDays, Star, RotateCcw, Activity } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StaffStatusBadge } from "@/components/shared/status-badge";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { PermissionLevelToggle } from "@/components/dashboard/staff/permission-level-toggle";
import {
  PERMISSION_AREAS,
  ROLE_LABELS,
  ROLE_BADGE_VARIANT,
  ROLE_DEFAULT_PERMISSIONS,
  getEffectivePermissions,
} from "@/lib/permissions";
import { formatDate } from "@/lib/utils-data";
import type { TeamMember } from "@/lib/team";
import type { PermissionArea, PermissionLevel, StaffStatus, StaffAccessRole } from "@/lib/data/types";

interface StaffDetailSheetProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateOverrides: (id: string, overrides: Partial<Record<PermissionArea, PermissionLevel>>) => void;
  onSetStatus: (id: string, status: StaffStatus) => void;
  onResendInvite: (id: string) => void;
  liveStats?: { classCount: number; sessionsRun: number; utilization: number };
  roleDefaults?: Record<StaffAccessRole, Record<PermissionArea, PermissionLevel>>;
}

export function StaffDetailSheet({
  member,
  open,
  onOpenChange,
  onUpdateOverrides,
  onSetStatus,
  onResendInvite,
  liveStats,
  roleDefaults = ROLE_DEFAULT_PERMISSIONS,
}: StaffDetailSheetProps) {
  if (!member) return null;

  const isOwner = member.accessRole === "owner";
  const defaults = roleDefaults[member.accessRole];
  const effective = getEffectivePermissions(member.accessRole, member.permissionOverrides, roleDefaults);
  const hasOverrides = Object.keys(member.permissionOverrides).length > 0;

  function setLevel(area: PermissionArea, level: PermissionLevel) {
    if (isOwner) return;
    const next = { ...member!.permissionOverrides };
    if (defaults[area] === level) {
      delete next[area];
    } else {
      next[area] = level;
    }
    onUpdateOverrides(member!.id, next);
  }

  function resetOverrides() {
    onUpdateOverrides(member!.id, {});
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback>{member.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="truncate">{member.name}</SheetTitle>
              <SheetDescription className="truncate">{member.title}</SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant={ROLE_BADGE_VARIANT[member.accessRole]}>{ROLE_LABELS[member.accessRole]}</Badge>
            <StaffStatusBadge status={member.status} />
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="flex-1">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5 text-foreground">
                <Mail className="size-4 text-muted-foreground" />
                {member.email}
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <Phone className="size-4 text-muted-foreground" />
                {member.phone}
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <CalendarDays className="size-4 text-muted-foreground" />
                Joined {formatDate(member.joinedOn)}
              </div>
            </div>

            {member.kind === "trainer" && (
              <>
                <Separator />
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Specialties</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.specialties?.map((s) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
                {member.bio && <p className="text-sm text-muted-foreground">{member.bio}</p>}
                <div className="grid grid-cols-3 gap-2 rounded-md border border-border p-3 text-center">
                  <div>
                    <p className="flex items-center justify-center gap-0.5 font-display text-sm font-bold tabular text-foreground">
                      <Star className="size-3 fill-brand-lime text-brand-lime" />
                      {member.rating}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{member.reviewCount} reviews</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold tabular text-foreground">{liveStats?.classCount ?? 0}</p>
                    <p className="text-[11px] text-muted-foreground">Classes/wk</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold tabular text-foreground">{member.yearsExperience}yr</p>
                    <p className="text-[11px] text-muted-foreground">Experience</p>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="permissions" className="space-y-3">
            {isOwner ? (
              <p className="text-sm text-muted-foreground">
                The account owner always has full access to every area. This can&apos;t be changed here.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Starts from the <span className="font-medium text-foreground">{ROLE_LABELS[member.accessRole]}</span> defaults. Adjust any area just for {member.name.split(" ")[0]}.
                  </p>
                  {hasOverrides && (
                    <Button variant="ghost" size="sm" onClick={resetOverrides} className="shrink-0">
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
                  )}
                </div>
                <div className="divide-y divide-border rounded-md border border-border">
                  {PERMISSION_AREAS.map((area) => {
                    const customized = member.permissionOverrides[area.key] !== undefined;
                    return (
                      <div key={area.key} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{area.label}</p>
                            {customized && <Badge variant="outline" className="text-[10px]">Customized</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{area.description}</p>
                        </div>
                        <PermissionLevelToggle
                          value={effective[area.key]}
                          onChange={(level) => setLevel(area.key, level)}
                          aria-label={`${member.name}'s access to ${area.label}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {member.recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title={member.status === "invited" ? "Hasn't started yet" : "No recent activity"}
                description={
                  member.status === "invited"
                    ? "Activity will show up here once they accept their invite."
                    : member.status === "inactive"
                      ? "This account is inactive, so there's nothing recent to show."
                      : "Nothing to show yet."
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {member.recentActivity.map((activity, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {activity}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        {!isOwner && (
          <SheetFooter className="mt-4 border-t border-border pt-4">
            {member.status === "active" ? (
              <ConfirmActionDialog
                trigger={<Button variant="outline" className="text-destructive">Deactivate account</Button>}
                title={`Deactivate ${member.name}?`}
                description="They'll immediately lose access to the dashboard. You can reactivate them at any time."
                confirmLabel="Deactivate"
                destructive
                onConfirm={() => onSetStatus(member.id, "inactive")}
              />
            ) : member.status === "inactive" ? (
              <ConfirmActionDialog
                trigger={<Button variant="outline">Reactivate account</Button>}
                title={`Reactivate ${member.name}?`}
                description="They'll regain access based on their current role and permissions."
                confirmLabel="Reactivate"
                onConfirm={() => onSetStatus(member.id, "active")}
              />
            ) : (
              <Button variant="outline" onClick={() => onResendInvite(member.id)}>
                Resend invite
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
