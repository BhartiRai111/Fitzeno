import Link from "next/link";
import { UserPlus, UserRoundPlus, CreditCard, CalendarPlus, UserCog, Wallet, Megaphone, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AddMemberDialog } from "@/components/dashboard/dialogs/add-member-dialog";
import { AddLeadDialog } from "@/components/dashboard/dialogs/add-lead-dialog";
import { RecordPaymentDialog } from "@/components/dashboard/dialogs/record-payment-dialog";
import { SendNotificationDialog } from "@/components/dashboard/dialogs/send-notification-dialog";
import { cn } from "@/lib/utils";

const actionClasses =
  "flex flex-1 flex-col items-center gap-2 rounded-md border border-border px-3 py-3.5 text-center transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ActionTrigger({ icon: Icon, label, className }: { icon: typeof UserPlus; label: string; className?: string }) {
  return (
    <button type="button" className={cn(actionClasses, className)}>
      <Icon className="size-[18px] text-primary" />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}

export function QuickActions() {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-3 font-display text-sm font-semibold text-foreground">Quick actions</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <AddMemberDialog trigger={<ActionTrigger icon={UserPlus} label="Add Member" />} />
        <AddLeadDialog trigger={<ActionTrigger icon={UserRoundPlus} label="Add Lead" />} />
        <Link href="/owner/memberships" className={actionClasses}>
          <CreditCard className="size-[18px] text-primary" />
          <span className="text-xs font-medium text-foreground">Create Plan</span>
        </Link>
        <Link href="/owner/classes" className={actionClasses}>
          <CalendarPlus className="size-[18px] text-primary" />
          <span className="text-xs font-medium text-foreground">Create Class</span>
        </Link>
        <Link href="/owner/staff" className={actionClasses}>
          <UserCog className="size-[18px] text-primary" />
          <span className="text-xs font-medium text-foreground">Add Trainer</span>
        </Link>
        <RecordPaymentDialog trigger={<ActionTrigger icon={Wallet} label="Record Payment" />} />
        <Link href="/owner/store?tab=pos" className={actionClasses}>
          <ShoppingBag className="size-[18px] text-primary" />
          <span className="text-xs font-medium text-foreground">New Sale</span>
        </Link>
        <SendNotificationDialog trigger={<ActionTrigger icon={Megaphone} label="Notify" />} />
      </div>
    </Card>
  );
}
