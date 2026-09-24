"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils-data";
import type { Product, InventoryMovementType } from "@/lib/data/types";

export interface StockAdjustmentInput {
  type: InventoryMovementType;
  quantity: number;
  note: string;
}

interface AdjustStockDialogProps {
  product: Product;
  trigger?: React.ReactNode;
  onAdjust: (input: StockAdjustmentInput) => void;
}

const TYPE_LABELS: Record<Extract<InventoryMovementType, "restock" | "damaged" | "adjustment">, string> = {
  restock: "Restock (incoming stock)",
  damaged: "Damaged / lost stock",
  adjustment: "Correction (stock count)",
};

export function AdjustStockDialog({ product, trigger, onAdjust }: AdjustStockDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [type, setType] = React.useState<InventoryMovementType>("restock");
  const [quantity, setQuantity] = React.useState("");
  const [note, setNote] = React.useState("");

  function resetForm() {
    setType("restock");
    setQuantity("");
    setNote("");
  }

  const parsedQty = Number(quantity) || 0;
  const signedQty = type === "restock" ? Math.abs(parsedQty) : -Math.abs(parsedQty);
  const resultingStock = Math.max(0, product.stock + signedQty);
  const invalid = parsedQty <= 0 || (type !== "restock" && Math.abs(parsedQty) > product.stock);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      onAdjust({ type, quantity: signedQty, note: note.trim() });
      toast.success("Stock updated", {
        description: `${product.name}: ${resultingStock} now in stock.`,
      });
      resetForm();
    }, 500);
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
          <Button size="sm" variant="outline">
            <PackagePlus className="size-4" />
            Adjust Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name} · currently {product.stock} in stock
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Movement type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InventoryMovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-quantity">Quantity</Label>
            <Input
              id="adjust-quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              required
            />
            {type !== "restock" && parsedQty > product.stock && (
              <p className="text-xs text-danger">Only {product.stock} in stock — can&apos;t remove {parsedQty}.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-note">Note</Label>
            <Textarea
              id="adjust-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={type === "restock" ? "Delivery from supplier, PO reference..." : "What happened to this stock?"}
              rows={2}
              required
            />
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Stock after this change</span>
            <span className="font-semibold tabular text-foreground">
              {parsedQty > 0 ? resultingStock : product.stock}
            </span>
          </div>
          {type === "restock" && parsedQty > 0 && (
            <p className="text-xs text-muted-foreground">
              Restock value at cost: {formatCurrency(product.cost * parsedQty)}
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} disabled={invalid}>
              Save Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
