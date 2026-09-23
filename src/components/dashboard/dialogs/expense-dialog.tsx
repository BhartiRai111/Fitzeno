"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/finance-helpers";
import type { Expense, ExpenseCategory, ExpenseStatus, ExpenseFrequency } from "@/lib/data/types";

export interface ExpenseInput {
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  dueDate?: string;
  status: ExpenseStatus;
  recurring: boolean;
  frequency: ExpenseFrequency;
  paymentMethod: "Card" | "Bank Transfer" | "Cash" | "UPI";
  vendor?: string;
  notes?: string;
}

interface ExpenseDialogProps {
  expense?: Expense;
  trigger?: React.ReactNode;
  onSave: (input: ExpenseInput) => void;
}

const FREQUENCY_LABELS: Record<Exclude<ExpenseFrequency, "one-time">, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function ExpenseDialog({ expense, trigger, onSave }: ExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [category, setCategory] = React.useState<ExpenseCategory>(expense?.category ?? "Rent");
  const [status, setStatus] = React.useState<ExpenseStatus>(expense?.status ?? "paid");
  const [recurring, setRecurring] = React.useState(expense?.recurring ?? false);
  const [frequency, setFrequency] = React.useState<Exclude<ExpenseFrequency, "one-time">>(
    expense?.recurring && expense.frequency !== "one-time" ? expense.frequency : "monthly"
  );
  const [paymentMethod, setPaymentMethod] = React.useState<ExpenseInput["paymentMethod"]>(expense?.paymentMethod ?? "Bank Transfer");
  const isEdit = !!expense;

  function resetForm() {
    setCategory(expense?.category ?? "Rent");
    setStatus(expense?.status ?? "paid");
    setRecurring(expense?.recurring ?? false);
    setFrequency(expense?.recurring && expense.frequency !== "one-time" ? expense.frequency : "monthly");
    setPaymentMethod(expense?.paymentMethod ?? "Bank Transfer");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const amount = Number(form.get("amount")) || 0;
    const date = String(form.get("date") ?? "");
    const dueDateRaw = String(form.get("dueDate") ?? "").trim();
    const vendor = String(form.get("vendor") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      onSave({
        title,
        category,
        amount,
        date,
        dueDate: status === "pending" && dueDateRaw ? dueDateRaw : undefined,
        status,
        recurring,
        frequency: recurring ? frequency : "one-time",
        paymentMethod,
        vendor: vendor || undefined,
        notes: notes || undefined,
      });
      toast.success(isEdit ? "Expense updated" : "Expense recorded", {
        description: isEdit ? `${title} has been updated.` : `${title} has been added to the ledger.`,
      });
      if (!isEdit) {
        (event.target as HTMLFormElement).reset();
        resetForm();
      }
    }, 600);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Record an expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update details for ${expense?.title}.` : "Log a business expense to the ledger."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={expense?.id ?? "new"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="expense-title">Title</Label>
              <Input id="expense-title" name="title" defaultValue={expense?.title} placeholder="Studio rent — October" required />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Amount (£)</Label>
              <Input id="expense-amount" name="amount" type="number" min="0.01" step="1" defaultValue={expense?.amount} placeholder="450" required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-date">Date</Label>
              <Input id="expense-date" name="date" type="date" defaultValue={expense?.date} required />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ExpenseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === "pending" && (
            <div className="space-y-1.5">
              <Label htmlFor="expense-due-date">Due date</Label>
              <Input id="expense-due-date" name="dueDate" type="date" defaultValue={expense?.dueDate} />
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <Label htmlFor="expense-recurring" className="cursor-pointer">Recurring expense</Label>
              <p className="text-xs text-muted-foreground">Repeats on a regular schedule.</p>
            </div>
            <div className="flex items-center gap-3">
              {recurring && (
                <Select value={frequency} onValueChange={(v) => setFrequency(v as Exclude<ExpenseFrequency, "one-time">)}>
                  <SelectTrigger className="h-9 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FREQUENCY_LABELS) as (keyof typeof FREQUENCY_LABELS)[]).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Switch id="expense-recurring" checked={recurring} onCheckedChange={setRecurring} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-vendor">Vendor (optional)</Label>
              <Input id="expense-vendor" name="vendor" defaultValue={expense?.vendor} placeholder="Riverside Property Management" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as ExpenseInput["paymentMethod"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-notes">Notes (optional)</Label>
            <Textarea id="expense-notes" name="notes" defaultValue={expense?.notes} placeholder="Any context worth keeping on record..." rows={2} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save Changes" : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
