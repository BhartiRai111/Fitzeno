"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Receipt, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SaleStatusBadge } from "@/components/shared/status-badge";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import { gymProfile } from "@/lib/data/gym";
import type { StoreSale } from "@/lib/data/types";

interface SaleReceiptDialogProps {
  sale: StoreSale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefund?: (saleId: string) => void;
}

export function SaleReceiptDialog({ sale, open, onOpenChange, onRefund }: SaleReceiptDialogProps) {
  if (!sale) return null;

  const totalUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <DialogTitle>{sale.orderNumber}</DialogTitle>
          </div>
          <DialogDescription>
            {gymProfile.name} · {formatDate(sale.date)} at {sale.time}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium text-foreground">{sale.memberName ?? "Walk-in customer"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sold by</span>
            <span className="font-medium text-foreground">{sale.soldBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment method</span>
            <span className="font-medium text-foreground">{sale.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <SaleStatusBadge status={sale.status} />
          </div>

          <Separator />

          <div className="space-y-2">
            {sale.items.map((item) => (
              <div key={item.productId} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 tabular font-medium text-foreground">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({totalUnits} item{totalUnits === 1 ? "" : "s"})</span>
              <span className="tabular">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount ({sale.discountPercent}%)</span>
                <span className="tabular text-success">−{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-display font-bold tabular text-foreground">{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Includes VAT</span>
              <span className="tabular">{formatCurrency(sale.tax)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={() => toast.success("Receipt downloaded", { description: `${sale.orderNumber}.pdf` })}
          >
            <Download className="size-4" />
            Download Receipt
          </Button>
          {onRefund && sale.status === "completed" && (
            <ConfirmActionDialog
              trigger={
                <Button variant="ghost" className="text-destructive">
                  <RotateCcw className="size-4" />
                  Refund Sale
                </Button>
              }
              title={`Refund ${sale.orderNumber}?`}
              description={`This returns ${formatCurrency(sale.total)} and restocks ${totalUnits} item${totalUnits === 1 ? "" : "s"} back into inventory.`}
              confirmLabel="Issue Refund"
              destructive
              onConfirm={() => onRefund(sale.id)}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
