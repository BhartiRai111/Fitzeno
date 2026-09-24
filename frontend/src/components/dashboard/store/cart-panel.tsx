"use client";

import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils-data";
import type { CartLine, SaleTotals } from "@/lib/store-helpers";
import type { Member, StoreSale } from "@/lib/data/types";

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20];

interface CartPanelProps {
  lines: CartLine[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  members: Member[];
  memberId: string;
  onMemberChange: (id: string) => void;
  discountPercent: number;
  onDiscountPercentChange: (value: number) => void;
  paymentMethod: StoreSale["paymentMethod"];
  onPaymentMethodChange: (method: StoreSale["paymentMethod"]) => void;
  totals: SaleTotals;
  onCompleteSale: () => void;
  onCancelSale: () => void;
  submitting: boolean;
}

export function CartPanel({
  lines,
  onIncrement,
  onDecrement,
  onRemove,
  members,
  memberId,
  onMemberChange,
  discountPercent,
  onDiscountPercentChange,
  paymentMethod,
  onPaymentMethodChange,
  totals,
  onCompleteSale,
  onCancelSale,
  submitting,
}: CartPanelProps) {
  const totalUnits = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <Card className="flex h-full flex-col p-0">
      <CardHeader className="border-b border-border px-4 py-3.5">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="size-4" />
          Current Sale
          {totalUnits > 0 && <span className="text-sm font-normal text-muted-foreground">· {totalUnits} item{totalUnits === 1 ? "" : "s"}</span>}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
        {lines.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Cart is empty"
            description="Tap a product to add it to this sale."
            className="border-none bg-transparent py-10"
          />
        ) : (
          lines.map((line) => (
            <div key={line.product.id} className="flex items-center gap-2 rounded-md py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{line.product.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(line.product.price)} each</p>
              </div>
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <Button type="button" size="icon" variant="ghost" className="size-6" onClick={() => onDecrement(line.product.id)} aria-label={`Remove one ${line.product.name}`}>
                  <Minus className="size-3" />
                </Button>
                <span className="min-w-[1.25rem] text-center text-xs font-semibold tabular text-foreground">{line.quantity}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => onIncrement(line.product.id)}
                  disabled={line.quantity >= line.product.stock}
                  aria-label={`Add one more ${line.product.name}`}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              <span className="w-14 shrink-0 text-right text-sm font-medium tabular text-foreground">
                {formatCurrency(line.product.price * line.quantity)}
              </span>
              <Button type="button" size="icon" variant="ghost" className="size-6 shrink-0 text-muted-foreground" onClick={() => onRemove(line.product.id)} aria-label={`Remove ${line.product.name} from sale`}>
                <X className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <div className="space-y-3 border-t border-border px-4 py-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Customer</Label>
            <Select value={memberId} onValueChange={onMemberChange}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in customer</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Discount</Label>
            <Select value={String(discountPercent)} onValueChange={(v) => onDiscountPercentChange(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISCOUNT_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d === 0 ? "No discount" : `${d}% off`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Payment method</Label>
          <Select value={paymentMethod} onValueChange={(v) => onPaymentMethodChange(v as StoreSale["paymentMethod"])}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Card">Card</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="tabular text-success">−{formatCurrency(totals.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="font-display tabular">{formatCurrency(totals.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Includes VAT</span>
            <span className="tabular">{formatCurrency(totals.tax)}</span>
          </div>
        </div>
      </div>

      <CardFooter className="gap-2 border-t border-border px-4 py-3.5">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancelSale} disabled={lines.length === 0 || submitting}>
          Cancel Sale
        </Button>
        <Button type="button" className="flex-1" onClick={onCompleteSale} disabled={lines.length === 0} loading={submitting}>
          Complete Sale
        </Button>
      </CardFooter>
    </Card>
  );
}
