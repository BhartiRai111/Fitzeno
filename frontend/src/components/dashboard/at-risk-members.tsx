"use client";

import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldCheck } from "lucide-react";
import { daysBetween } from "@/lib/utils-data";
import type { Member } from "@/lib/data/types";

const thresholds = [7, 14, 30] as const;

export function AtRiskMembers({ members, today }: { members: Member[]; today: string }) {
  const buckets = thresholds.map((threshold, i) => {
    const lower = threshold;
    const upper = thresholds[i + 1];
    return {
      threshold,
      members: members.filter((m) => {
        const days = daysBetween(m.lastCheckIn, today);
        return upper ? days >= lower && days < upper : days >= lower;
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
              {bucket.members.map((member) => {
                const days = daysBetween(member.lastCheckIn, today);
                return (
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
                          {member.plan} · Last visit {days} days ago
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
                );
              })}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
