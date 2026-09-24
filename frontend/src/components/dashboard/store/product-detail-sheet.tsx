"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StockStatusBadge, SaleStatusBadge } from "@/components/shared/status-badge";
import { ProductDialog, type ProductInput } from "@/components/dashboard/dialogs/product-dialog";
import { AdjustStockDialog, type StockAdjustmentInput } from "@/components/dashboard/dialogs/adjust-stock-dialog";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import { getStockStatus, getProductSales } from "@/lib/store-helpers";
import { Pencil, PackagePlus, Ban, RotateCcw, History, Receipt } from "lucide-react";
import type { Product, Supplier, StoreSale, InventoryMovement } from "@/lib/data/types";

interface ProductDetailSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
  sales: StoreSale[];
  movements: InventoryMovement[];
  onSaveProduct: (input: ProductInput) => void;
  onAdjustStock: (input: StockAdjustmentInput) => void;
  onToggleActive: (productId: string) => void;
}

const MOVEMENT_LABELS: Record<InventoryMovement["type"], string> = {
  restock: "Restock",
  sale: "Sale",
  return: "Return",
  damaged: "Damaged / lost",
  adjustment: "Correction",
};

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  supplier,
  sales,
  movements,
  onSaveProduct,
  onAdjustStock,
  onToggleActive,
}: ProductDetailSheetProps) {
  if (!product) {
    return <Sheet open={open} onOpenChange={onOpenChange} />;
  }

  const status = getStockStatus(product);
  const margin = product.price > 0 ? Math.round(((product.price - product.cost) / product.price) * 100) : 0;
  const productSales = getProductSales(sales, product.id).filter((s) => s.status !== "cancelled");
  const unitsSold = productSales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + (s.items.find((i) => i.productId === product.id)?.quantity ?? 0), 0);
  const revenue = productSales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => {
      const item = s.items.find((i) => i.productId === product.id);
      return sum + (item ? item.unitPrice * item.quantity : 0);
    }, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{product.name}</SheetTitle>
            {!product.active && <Badge variant="default">Discontinued</Badge>}
          </div>
          <SheetDescription>{product.sku} · {product.category}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-2">
            <StockStatusBadge status={status} />
            <span className="text-sm text-muted-foreground">{product.stock} in stock · low stock at {product.lowStockThreshold}</span>
          </div>

          {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}

          <Separator />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium tabular text-foreground">{formatCurrency(product.price)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="font-medium tabular text-foreground">{formatCurrency(product.cost)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Margin</dt>
              <dd className="font-medium tabular text-foreground">{margin}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="font-medium text-foreground">{supplier?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Units sold</dt>
              <dd className="font-medium tabular text-foreground">{unitsSold}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Revenue generated</dt>
              <dd className="font-medium tabular text-foreground">{formatCurrency(revenue)}</dd>
            </div>
          </dl>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <ProductDialog
              product={product}
              onSave={onSaveProduct}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil className="size-4" />
                  Edit
                </Button>
              }
            />
            <AdjustStockDialog
              product={product}
              onAdjust={onAdjustStock}
              trigger={
                <Button size="sm" variant="outline">
                  <PackagePlus className="size-4" />
                  Adjust Stock
                </Button>
              }
            />
            <Button
              size="sm"
              variant="outline"
              className={product.active ? "text-destructive" : ""}
              onClick={() => onToggleActive(product.id)}
            >
              {product.active ? <Ban className="size-4" /> : <RotateCcw className="size-4" />}
              {product.active ? "Discontinue" : "Reactivate"}
            </Button>
          </div>

          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">
                <Receipt className="size-3.5" />
                Sales history
              </TabsTrigger>
              <TabsTrigger value="movements">
                <History className="size-3.5" />
                Stock movements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-1 pt-1">
              {productSales.length === 0 ? (
                <EmptyState icon={Receipt} title="No sales yet" description="This product hasn't sold through the POS yet." className="border-none bg-transparent py-8" />
              ) : (
                productSales.map((sale) => {
                  const item = sale.items.find((i) => i.productId === product.id)!;
                  return (
                    <div key={sale.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{sale.orderNumber} · {item.quantity} unit{item.quantity === 1 ? "" : "s"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(sale.date)} · {sale.memberName ?? "Walk-in"}</p>
                      </div>
                      <SaleStatusBadge status={sale.status} />
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="movements" className="space-y-1 pt-1">
              {movements.length === 0 ? (
                <EmptyState icon={History} title="No movements yet" description="Stock changes for this product will show up here." className="border-none bg-transparent py-8" />
              ) : (
                movements.map((movement) => (
                  <div key={movement.id} className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{MOVEMENT_LABELS[movement.type]}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(movement.date)} · {movement.note}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold tabular ${movement.quantity > 0 ? "text-success" : "text-danger"}`}>
                      {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                    </span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
