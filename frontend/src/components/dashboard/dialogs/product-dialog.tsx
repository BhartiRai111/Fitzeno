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
import { suppliers } from "@/lib/data/suppliers";
import { PRODUCT_CATEGORIES } from "@/lib/store-helpers";
import type { Product, ProductCategory } from "@/lib/data/types";

export interface ProductInput {
  name: string;
  sku: string;
  category: ProductCategory;
  description: string;
  price: number;
  cost: number;
  stock?: number;
  lowStockThreshold: number;
  supplierId?: string;
  active: boolean;
}

interface ProductDialogProps {
  product?: Product;
  trigger?: React.ReactNode;
  onSave: (input: ProductInput) => void;
}

export function ProductDialog({ product, trigger, onSave }: ProductDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [category, setCategory] = React.useState<ProductCategory>(product?.category ?? "Supplements");
  const [supplierId, setSupplierId] = React.useState<string>(product?.supplierId ?? "none");
  const [active, setActive] = React.useState(product?.active ?? true);
  const isEdit = !!product;

  function resetForm() {
    setCategory(product?.category ?? "Supplements");
    setSupplierId(product?.supplierId ?? "none");
    setActive(product?.active ?? true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const sku = String(form.get("sku") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const price = Number(form.get("price")) || 0;
    const cost = Number(form.get("cost")) || 0;
    const lowStockThreshold = Number(form.get("lowStockThreshold")) || 0;
    const stockRaw = form.get("stock");

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      onSave({
        name,
        sku,
        category,
        description,
        price,
        cost,
        lowStockThreshold,
        supplierId: supplierId === "none" ? undefined : supplierId,
        active,
        stock: stockRaw !== null ? Number(stockRaw) || 0 : undefined,
      });
      toast.success(isEdit ? "Product updated" : "Product added", {
        description: isEdit ? `${name} has been updated.` : `${name} is now in the catalog.`,
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
            Add Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add a product"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update details for ${product?.name}.` : "Add a new item to the store catalog."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={product?.id ?? "new"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="product-name">Product name</Label>
              <Input id="product-name" name="name" defaultValue={product?.name} placeholder="Whey Protein — Vanilla (2.27kg)" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-sku">SKU</Label>
              <Input id="product-sku" name="sku" defaultValue={product?.sku} placeholder="SUP-WPV-227" required />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-description">Description</Label>
            <Textarea id="product-description" name="description" defaultValue={product?.description} placeholder="Short description shown to staff at checkout." rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Price (£)</Label>
              <Input id="product-price" name="price" type="number" min="0" step="1" defaultValue={product?.price} placeholder="45" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-cost">Cost (£)</Label>
              <Input id="product-cost" name="cost" type="number" min="0" step="1" defaultValue={product?.cost} placeholder="28" required />
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="product-stock">Starting stock</Label>
                <Input id="product-stock" name="stock" type="number" min="0" step="1" placeholder="20" required />
              </div>
            )}
            <div className={`space-y-1.5 ${isEdit ? "col-span-2" : ""}`}>
              <Label htmlFor="product-low-stock">Low stock at</Label>
              <Input id="product-low-stock" name="lowStockThreshold" type="number" min="0" step="1" defaultValue={product?.lowStockThreshold} placeholder="10" required />
            </div>
          </div>

          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Stock isn&apos;t edited here — use Restock or Adjust stock from the Inventory tab so changes stay in the movement history.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Supplier (optional)</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label htmlFor="product-active" className="cursor-pointer">Sold in store</Label>
                <p className="text-xs text-muted-foreground">Off hides it from the POS.</p>
              </div>
              <Switch id="product-active" checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
