import { Pill, GlassWater, Shirt, Backpack, Dumbbell, Plus, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils-data";
import { getStockStatus } from "@/lib/store-helpers";
import type { Product, ProductCategory } from "@/lib/data/types";

const CATEGORY_META: Record<ProductCategory, { icon: typeof Pill; className: string }> = {
  Supplements: { icon: Pill, className: "bg-info-tint text-info" },
  Hydration: { icon: GlassWater, className: "bg-success-tint text-success" },
  Apparel: { icon: Shirt, className: "bg-primary/10 text-primary" },
  Accessories: { icon: Backpack, className: "bg-warning-tint text-warning" },
  Equipment: { icon: Dumbbell, className: "bg-accent text-accent-foreground" },
};

interface ProductTileProps {
  product: Product;
  quantityInCart: number;
  onAdd: (productId: string) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
}

export function ProductTile({ product, quantityInCart, onAdd, onIncrement, onDecrement }: ProductTileProps) {
  const meta = CATEGORY_META[product.category];
  const Icon = meta.icon;
  const status = getStockStatus(product);
  const outOfStock = status === "out-of-stock";
  const atStockLimit = quantityInCart >= product.stock;

  return (
    <Card className={cn("flex flex-col gap-2.5 p-3.5", outOfStock && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", meta.className)}>
          <Icon className="size-[18px]" />
        </span>
        {status !== "in-stock" && (
          <Badge variant={status === "out-of-stock" ? "danger" : "warning"} className="shrink-0">
            {status === "out-of-stock" ? "Out of stock" : `${product.stock} left`}
          </Badge>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-tight text-foreground">{product.name}</p>
        <p className="mt-1 text-sm font-semibold tabular text-foreground">{formatCurrency(product.price)}</p>
      </div>

      {outOfStock ? (
        <Button size="sm" variant="outline" disabled className="w-full">
          Unavailable
        </Button>
      ) : quantityInCart > 0 ? (
        <div className="flex items-center justify-between gap-1 rounded-md border border-border p-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => onDecrement(product.id)}
            aria-label={`Remove one ${product.name}`}
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular text-foreground">{quantityInCart}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => onIncrement(product.id)}
            disabled={atStockLimit}
            aria-label={`Add one more ${product.name}`}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={() => onAdd(product.id)}>
          <Plus className="size-3.5" />
          Add
        </Button>
      )}
    </Card>
  );
}
