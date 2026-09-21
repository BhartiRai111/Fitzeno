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

interface RecordPaymentDialogProps {
  trigger?: React.ReactNode;
}

export function RecordPaymentDialog({ trigger }: RecordPaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount") ?? "");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      toast.success("Payment recorded", {
        description: `£${amount || "0"} has been logged and a receipt will be sent.`,
      });
      (event.target as HTMLFormElement).reset();
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
            <Select defaultValue={members[0]?.id}>
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
              <Input id="record-payment-amount" name="amount" type="number" min="0" step="0.01" placeholder="69.00" required />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select defaultValue="Card">
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
            <Select defaultValue="Membership">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Membership">Membership renewal</SelectItem>
                <SelectItem value="Personal Training">Personal training</SelectItem>
                <SelectItem value="Classes">Drop-in class</SelectItem>
                <SelectItem value="Retail">Retail / products</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
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
