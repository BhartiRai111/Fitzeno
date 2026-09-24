import { TODAY } from "@/lib/booking-helpers";
import { daysBetween } from "@/lib/utils-data";
import type { Product, ProductCategory, StockStatus, StoreSale, InventoryMovement } from "@/lib/data/types";

export { TODAY };

export const PRODUCT_CATEGORIES: ProductCategory[] = ["Supplements", "Hydration", "Apparel", "Accessories", "Equipment"];

// ---------------------------------------------------------------------------
// Stock status
// ---------------------------------------------------------------------------

export function getStockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return "out-of-stock";
  if (product.stock <= product.lowStockThreshold) return "low-stock";
  return "in-stock";
}

export function isLowStock(product: Product): boolean {
  return getStockStatus(product) === "low-stock";
}

export function isOutOfStock(product: Product): boolean {
  return product.stock <= 0;
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products.filter((p) => p.active && getStockStatus(p) !== "in-stock").sort((a, b) => a.stock - b.stock);
}

// ---------------------------------------------------------------------------
// Sale totals
// ---------------------------------------------------------------------------

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface SaleTotals {
  subtotal: number;
  discountAmount: number;
  total: number;
  /** VAT portion already included within `total` (UK prices are tax-inclusive) — informational only. */
  tax: number;
}

export function computeSaleTotals(lines: CartLine[], discountPercent: number): SaleTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(total * (20 / 120));
  return { subtotal, discountAmount, total, tax };
}

/** A plausible in-hours "now" for a freshly completed sale, independent of the real server clock. */
export function getPosTime(): string {
  const now = new Date();
  const hour = 9 + (now.getHours() % 11); // keeps sales within a 09:00–19:59 window
  const minute = now.getMinutes();
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

let orderSequence = 1014;

/** Generates the next sequential order number for a freshly completed sale. */
export function generateOrderNumber(existingSales: StoreSale[]): string {
  const highest = existingSales.reduce((max, sale) => {
    const n = Number(sale.orderNumber.replace("POS-", ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, orderSequence);
  orderSequence = highest + 1;
  return `POS-${orderSequence}`;
}

// ---------------------------------------------------------------------------
// Stats / insights
// ---------------------------------------------------------------------------

export interface StoreStats {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
  avgOrderValue: number;
}

function isCounted(sale: StoreSale) {
  return sale.status === "completed";
}

export function getStoreStats(sales: StoreSale[], products: Product[], today: string = TODAY): StoreStats {
  const monthPrefix = today.slice(0, 7);
  const counted = sales.filter(isCounted);
  const todaySales = counted.filter((s) => s.date === today);
  const monthSales = counted.filter((s) => s.date.startsWith(monthPrefix));

  const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);

  return {
    todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
    todayOrders: todaySales.length,
    monthRevenue,
    monthOrders: monthSales.length,
    lowStockCount: products.filter((p) => p.active && getStockStatus(p) === "low-stock").length,
    outOfStockCount: products.filter((p) => p.active && getStockStatus(p) === "out-of-stock").length,
    avgOrderValue: monthSales.length > 0 ? Math.round(monthRevenue / monthSales.length) : 0,
  };
}

export interface TopSellingProduct {
  productId: string;
  name: string;
  category: ProductCategory;
  unitsSold: number;
  revenue: number;
}

export function getTopSellingProducts(sales: StoreSale[], products: Product[], limit = 5): TopSellingProduct[] {
  const totals = new Map<string, { unitsSold: number; revenue: number }>();
  for (const sale of sales.filter(isCounted)) {
    for (const item of sale.items) {
      const existing = totals.get(item.productId) ?? { unitsSold: 0, revenue: 0 };
      existing.unitsSold += item.quantity;
      existing.revenue += item.unitPrice * item.quantity;
      totals.set(item.productId, existing);
    }
  }
  return [...totals.entries()]
    .map(([productId, stats]) => {
      const product = products.find((p) => p.id === productId);
      return {
        productId,
        name: product?.name ?? "Unknown product",
        category: product?.category ?? "Accessories",
        ...stats,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface CategoryRevenue {
  category: ProductCategory;
  revenue: number;
  share: number;
}

export function getRevenueByCategory(sales: StoreSale[], products: Product[]): CategoryRevenue[] {
  const totals = new Map<ProductCategory, number>();
  let grandTotal = 0;
  for (const sale of sales.filter(isCounted)) {
    for (const item of sale.items) {
      const product = products.find((p) => p.id === item.productId);
      const category = product?.category ?? "Accessories";
      const amount = item.unitPrice * item.quantity;
      totals.set(category, (totals.get(category) ?? 0) + amount);
      grandTotal += amount;
    }
  }
  return [...totals.entries()]
    .map(([category, revenue]) => ({ category, revenue, share: grandTotal > 0 ? Math.round((revenue / grandTotal) * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Retail value of current stock on hand, at cost — a proxy for cash tied up in inventory. */
export function getInventoryValueAtCost(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.cost * p.stock, 0);
}

/** Retail value of current stock on hand, at sale price — a proxy for potential revenue. */
export function getInventoryValueAtPrice(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.price * p.stock, 0);
}

export function getProductSales(sales: StoreSale[], productId: string): StoreSale[] {
  return sales.filter((s) => s.items.some((i) => i.productId === productId));
}

// ---------------------------------------------------------------------------
// Movement log — supply-side movements plus sale/return movements derived
// from storeSales, so nothing needs to be duplicated by hand.
// ---------------------------------------------------------------------------

export function getAllMovements(manualMovements: InventoryMovement[], sales: StoreSale[]): InventoryMovement[] {
  const derived: InventoryMovement[] = [];
  for (const sale of sales) {
    if (sale.status === "cancelled") continue;
    for (const item of sale.items) {
      derived.push({
        id: `mv-sale-${sale.id}-${item.productId}`,
        productId: item.productId,
        type: sale.status === "refunded" ? "return" : "sale",
        quantity: sale.status === "refunded" ? item.quantity : -item.quantity,
        date: sale.date,
        note: sale.status === "refunded" ? `Returned from order ${sale.orderNumber}.` : `Sold via order ${sale.orderNumber}.`,
        reference: sale.orderNumber,
      });
    }
  }
  return [...manualMovements, ...derived].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getMovementsForProduct(movements: InventoryMovement[], productId: string): InventoryMovement[] {
  return movements.filter((m) => m.productId === productId);
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function isRecentlyAdded(product: Product, today: string = TODAY, withinDays = 14): boolean {
  return daysBetween(product.createdOn, today) <= withinDays;
}
