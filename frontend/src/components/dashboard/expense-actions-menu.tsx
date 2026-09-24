"use client";

import { toast } from "sonner";
import { MoreVertical, Eye, Pencil, CheckCircle2, Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpenseDialog, type ExpenseInput } from "@/components/dashboard/dialogs/expense-dialog";
import { ExpenseReceiptDialog } from "@/components/dashboard/dialogs/expense-receipt-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { formatCurrency } from "@/lib/utils-data";
import type { Expense } from "@/lib/data/types";

interface ExpenseActionsMenuProps {
  expense: Expense;
  onEdit: (id: string, input: ExpenseInput) => void;
  onMarkPaid: (id: string) => void;
  onCancel: (id: string) => void;
  onReopen: (id: string) => void;
}

export function ExpenseActionsMenu({ expense, onEdit, onMarkPaid, onCancel, onReopen }: ExpenseActionsMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${expense.title}`}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ExpenseReceiptDialog
          expense={expense}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Eye />
              View
            </DropdownMenuItem>
          }
        />
        <ExpenseDialog
          expense={expense}
          onSave={(input) => onEdit(expense.id, input)}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          }
        />
        {expense.status === "pending" && (
          <>
            <DropdownMenuSeparator />
            <ConfirmActionDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <CheckCircle2 />
                  Mark as Paid
                </DropdownMenuItem>
              }
              title={`Mark ${expense.title} as paid?`}
              description={`This records ${formatCurrency(expense.amount)} as paid today.`}
              confirmLabel="Mark as Paid"
              onConfirm={() => {
                onMarkPaid(expense.id);
                toast.success(`${expense.title} marked as paid`);
              }}
            />
            <ConfirmActionDialog
              trigger={
                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                  <Ban />
                  Cancel Expense
                </DropdownMenuItem>
              }
              title={`Cancel ${expense.title}?`}
              description="This voids the pending expense — it won't count toward totals."
              confirmLabel="Cancel Expense"
              destructive
              onConfirm={() => {
                onCancel(expense.id);
                toast.success(`${expense.title} cancelled`);
              }}
            />
          </>
        )}
        {expense.status === "cancelled" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { onReopen(expense.id); toast.success(`${expense.title} reopened as pending`); }}>
              <RotateCcw />
              Reopen as Pending
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
