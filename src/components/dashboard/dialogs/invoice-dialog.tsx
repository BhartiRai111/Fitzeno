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
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import { gymProfile } from "@/lib/data/gym";
import type { Payment } from "@/lib/data/types";

export function InvoiceDialog({ payment, trigger }: { payment: Payment; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <DialogTitle>{payment.invoiceId}</DialogTitle>
          </div>
          <DialogDescription>Issued by {gymProfile.name} · {formatDate(payment.date)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Billed to</span><span className="font-medium text-foreground">{payment.memberName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="font-medium text-foreground">{payment.plan}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Payment method</span><span className="font-medium text-foreground">{payment.method}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><PaymentStatusBadge status={payment.status} /></div>
          <Separator />
          <div className="flex justify-between text-base">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-display font-bold tabular text-foreground">{formatCurrency(payment.amount)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              toast.success("Invoice downloaded", { description: `${payment.invoiceId}.pdf` });
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
