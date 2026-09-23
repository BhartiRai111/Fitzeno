"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ExpenseStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import { gymProfile } from "@/lib/data/gym";
import type { Expense } from "@/lib/data/types";

export function ExpenseReceiptDialog({ expense, trigger }: { expense: Expense; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <DialogTitle>{expense.reference}</DialogTitle>
          </div>
          <DialogDescription>
            {gymProfile.name} · {formatDate(expense.date)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium text-foreground">{expense.title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium text-foreground">{expense.category}</span></div>
          {expense.vendor && (
            <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span className="font-medium text-foreground">{expense.vendor}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Payment method</span><span className="font-medium text-foreground">{expense.paymentMethod}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frequency</span>
            <span className="font-medium text-foreground">
              {expense.recurring ? `Recurring — ${expense.frequency}` : "One-time"}
            </span>
          </div>
          {expense.dueDate && (
            <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span className="font-medium text-foreground">{formatDate(expense.dueDate)}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Recorded by</span><span className="font-medium text-foreground">{expense.recordedBy}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><ExpenseStatusBadge status={expense.status} /></div>
          {expense.notes && (
            <div className="rounded-md bg-muted/40 p-3 text-muted-foreground">{expense.notes}</div>
          )}
          <Separator />
          <div className="flex justify-between text-base">
            <span className="font-semibold text-foreground">Amount</span>
            <span className="font-display font-bold tabular text-foreground">{formatCurrency(expense.amount)}</span>
          </div>
          {expense.recurring && (
            <div className="flex justify-end">
              <Badge variant="outline">Repeats {expense.frequency}</Badge>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              toast.success("Receipt downloaded", { description: `${expense.reference}.pdf` });
              setOpen(false);
            }}
          >
            <Download className="size-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
