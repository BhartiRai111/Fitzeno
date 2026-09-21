"use client";

import Link from "next/link";
import { toast } from "sonner";
import { MoreVertical, Eye, Pencil, RefreshCcw, Snowflake, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditMemberDialog } from "@/components/dashboard/dialogs/edit-member-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import type { Member } from "@/lib/data/types";

export function MemberActionsMenu({ member }: { member: Member }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${member.name}`}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/owner/members/${member.id}`}>
            <Eye />
            View Profile
          </Link>
        </DropdownMenuItem>
        <EditMemberDialog
          member={member}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          }
        />
        <DropdownMenuSeparator />
        <ConfirmActionDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <RefreshCcw />
              Renew
            </DropdownMenuItem>
          }
          title={`Renew ${member.name}'s membership?`}
          description={`This will extend their ${member.plan} plan by one billing cycle.`}
          confirmLabel="Renew Membership"
          onConfirm={() => toast.success(`${member.name}'s membership renewed`)}
        />
        <ConfirmActionDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Snowflake />
              Freeze
            </DropdownMenuItem>
          }
          title={`Freeze ${member.name}'s membership?`}
          description="Their billing and access will pause until unfrozen."
          confirmLabel="Freeze Membership"
          onConfirm={() => toast.success(`${member.name}'s membership frozen`)}
        />
        <ConfirmActionDialog
          trigger={
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Ban />
              Cancel
            </DropdownMenuItem>
          }
          title={`Cancel ${member.name}'s membership?`}
          description="This cancels their plan at the end of the current billing period. This can't be easily undone."
          confirmLabel="Cancel Membership"
          destructive
          onConfirm={() => toast.success(`${member.name}'s membership cancelled`)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
