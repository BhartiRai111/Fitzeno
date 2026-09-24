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
import { useRenewMembership, useFreezeMembership, useCancelMembership } from "@/hooks/use-members";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { Member } from "@/lib/data/types";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof NetworkError ? err.message : fallback;
}

export function MemberActionsMenu({ member, membershipId }: { member: Member; membershipId?: string | null }) {
  const renew = useRenewMembership();
  const freeze = useFreezeMembership();
  const cancel = useCancelMembership();

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
            <DropdownMenuItem disabled={!membershipId} onSelect={(e) => e.preventDefault()}>
              <RefreshCcw />
              Renew
            </DropdownMenuItem>
          }
          title={`Renew ${member.name}'s membership?`}
          description={`This will extend their ${member.plan} plan by one billing cycle.`}
          confirmLabel="Renew Membership"
          onConfirm={async () => {
            if (!membershipId) return;
            try {
              await renew.mutateAsync({ id: membershipId });
              toast.success(`${member.name}'s membership renewed`);
            } catch (err) {
              toast.error(errorMessage(err, "Couldn't renew this membership."));
            }
          }}
        />
        <ConfirmActionDialog
          trigger={
            <DropdownMenuItem disabled={!membershipId} onSelect={(e) => e.preventDefault()}>
              <Snowflake />
              Freeze
            </DropdownMenuItem>
          }
          title={`Freeze ${member.name}'s membership?`}
          description="Their billing and access will pause until unfrozen."
          confirmLabel="Freeze Membership"
          onConfirm={async () => {
            if (!membershipId) return;
            try {
              await freeze.mutateAsync(membershipId);
              toast.success(`${member.name}'s membership frozen`);
            } catch (err) {
              toast.error(errorMessage(err, "Couldn't freeze this membership."));
            }
          }}
        />
        <ConfirmActionDialog
          trigger={
            <DropdownMenuItem variant="destructive" disabled={!membershipId} onSelect={(e) => e.preventDefault()}>
              <Ban />
              Cancel
            </DropdownMenuItem>
          }
          title={`Cancel ${member.name}'s membership?`}
          description="This cancels their plan at the end of the current billing period. This can't be easily undone."
          confirmLabel="Cancel Membership"
          destructive
          onConfirm={async () => {
            if (!membershipId) return;
            try {
              await cancel.mutateAsync({ id: membershipId });
              toast.success(`${member.name}'s membership cancelled`);
            } catch (err) {
              toast.error(errorMessage(err, "Couldn't cancel this membership."));
            }
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
