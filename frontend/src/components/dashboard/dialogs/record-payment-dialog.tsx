"use client";

import * as React from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { members } from "@/lib/data/members";
import { formatCurrency } from "@/lib/utils-data";
import type { Payment, RevenueCategory } from "@/lib/data/types";

export interface RecordPaymentInput {
  memberName: string;
  memberInitials: string;
  amount: number;
  method: Payment["method"];
  category: RevenueCategory;
  plan: string;
}

interface RecordPaymentDialogProps {
  trigger?: React.ReactNode;
  onRecord?: (input: RecordPaymentInput) => void;
}

const categoryLabels: Record<RevenueCategory, string> = {
  Membership: "Membership renewal",
  "Personal Training": "Personal training",
  Classes: "Drop-in class",
  Retail: "Retail / products",
  Other: "Other",
};

export function RecordPaymentDialog({ trigger, onRecord }: RecordPaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [memberId, setMemberId] = React.useState(members[0]?.id);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<Payment["method"]>("Card");
  const [category, setCategory] = React.useState<RevenueCategory>("Membership");

  function resetForm() {
    setMemberId(members[0]?.id);
    setAmount("");
    setMethod("Card");
    setCategory("Membership");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const numericAmount = Number(amount) || 0;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      onRecord?.({
        memberName: member.name,
        memberInitials: member.initials,
        amount: numericAmount,
        method,
        category,
        plan: category === "Membership" ? member.plan : categoryLabels[category],
      });
      toast.success("Payment recorded", {
        description: `${formatCurrency(numericAmount)} logged for ${member.name}.`,
      });
      resetForm();
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Wallet className="size-4" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>Log an in-person or manually processed payment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} — {member.plan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="record-payment-amount">Amount (£)</Label>
              <Input
                id="record-payment-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="69.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Payment["method"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as RevenueCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryLabels) as RevenueCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
