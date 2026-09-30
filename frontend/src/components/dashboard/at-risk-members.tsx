"use client";

import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldCheck } from "lucide-react";

const thresholds = [7, 14, 30] as const;

export interface AtRiskMember {
  id: string;
  name: string;
  initials: string;
  plan?: string;
  /** Days since the member's last check-in — null means they have no recorded check-in at all. */
  daysSinceLastVisit: number | null;
}

export function AtRiskMembers({ members }: { members: AtRiskMember[] }) {
  const buckets = thresholds.map((threshold, i) => {
    const upper = thresholds[i + 1];
    return {
      threshold,
      members: members.filter((m) => {
        if (m.daysSinceLastVisit === null) return !upper;
        return upper ? m.daysSinceLastVisit >= threshold && m.daysSinceLastVisit < upper : m.daysSinceLastVisit >= threshold;
      }),
    };
  });

  return (
    <Tabs defaultValue="7">
      <TabsList>
        {buckets.map((bucket) => (
          <TabsTrigger key={bucket.threshold} value={String(bucket.threshold)}>
            {bucket.threshold}+ days ({bucket.members.length})
          </TabsTrigger>
        ))}
      </TabsList>
      {buckets.map((bucket) => (
        <TabsContent key={bucket.threshold} value={String(bucket.threshold)}>
          {bucket.members.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No one in this range"
              description="No members have been inactive for this long."
            />
          ) : (
            <div className="space-y-1">
              {bucket.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.plan ? `${member.plan} · ` : ""}
                        {member.daysSinceLastVisit === null ? "Never checked in" : `Last visit ${member.daysSinceLastVisit} days ago`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => toast.success(`Reminder sent to ${member.name}`)}
                  >
                    Send Reminder
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
