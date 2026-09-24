"use client";

import Link from "next/link";
import { MoreVertical, Eye, BellRing, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarCheck2 } from "lucide-react";
import { formatDate, daysBetween } from "@/lib/utils-data";
import type { Member } from "@/lib/data/types";

export function ExpiringMembersList({ members, today }: { members: Member[]; today: string }) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck2}
        title="Nothing expiring soon"
        description="No memberships are due to expire in the next 7 days."
      />
    );
  }

  return (
    <div className="space-y-1">
      {members.map((member) => {
        const daysLeft = daysBetween(today, member.expiresOn);
        return (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
          >
            <Link href={`/owner/members/${member.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.plan} · Expires {daysLeft <= 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                </p>
              </div>
            </Link>
            <Badge variant="warning" className="hidden sm:inline-flex">
              {formatDate(member.expiresOn)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Actions for ${member.name}`}>
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/owner/members/${member.id}`}>
                    <Eye />
                    View member
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.success(`Reminder sent to ${member.name}`)}>
                  <BellRing />
                  Send reminder
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.success(`Renewal started for ${member.name}`)}>
                  <RefreshCcw />
                  Renew
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}
