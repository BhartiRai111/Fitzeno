import type { InventoryMovement } from "./types";

/**
 * Supply-side stock movements only — restocks, damaged/lost stock, and manual
 * corrections. Sale-driven decrements and return credits are derived from
 * `storeSales` at render time by `getAllMovements()` in store-helpers.ts, so
 * they aren't duplicated here.
 */
export const inventoryMovements: InventoryMovement[] = [
  { id: "im-1", productId: "pr-1", type: "restock", quantity: 20, date: "2026-08-04", note: "Initial stock-in ahead of September promo.", reference: "PO-4471" },
  { id: "im-2", productId: "pr-2", type: "restock", quantity: 30, date: "2026-08-04", note: "Initial stock-in.", reference: "PO-4471" },
  { id: "im-3", productId: "pr-3", type: "restock", quantity: 20, date: "2026-08-04", note: "Initial stock-in.", reference: "PO-4471" },
  { id: "im-4", productId: "pr-4", type: "restock", quantity: 15, date: "2026-08-04", note: "Initial stock-in.", reference: "PO-4471" },
  { id: "im-5", productId: "pr-4", type: "damaged", quantity: -3, date: "2026-08-22", note: "Damaged in transit from supplier — box crushed, tubs punctured.", reference: "PO-4471" },
  { id: "im-6", productId: "pr-5", type: "restock", quantity: 36, date: "2026-08-10", note: "Initial stock-in.", reference: "PO-4472" },
  { id: "im-7", productId: "pr-6", type: "restock", quantity: 30, date: "2026-07-15", note: "Initial stock-in.", reference: "PO-4390" },
  { id: "im-8", productId: "pr-7", type: "restock", quantity: 50, date: "2026-07-15", note: "Initial stock-in.", reference: "PO-4390" },
  { id: "im-9", productId: "pr-8", type: "restock", quantity: 24, date: "2026-08-18", note: "Initial stock-in.", reference: "PO-4480" },
  { id: "im-10", productId: "pr-9", type: "restock", quantity: 40, date: "2026-06-01", note: "Initial stock-in for the Performance Tee launch.", reference: "PO-4210" },
  { id: "im-11", productId: "pr-10", type: "restock", quantity: 18, date: "2026-06-01", note: "Initial stock-in.", reference: "PO-4210" },
  { id: "im-12", productId: "pr-11", type: "restock", quantity: 16, date: "2026-06-20", note: "Initial stock-in.", reference: "PO-4225" },
  { id: "im-13", productId: "pr-12", type: "restock", quantity: 20, date: "2026-06-20", note: "Initial stock-in.", reference: "PO-4225" },
  { id: "im-14", productId: "pr-13", type: "restock", quantity: 25, date: "2026-03-05", note: "Limited edition run — anniversary drop.", reference: "PO-3980" },
  { id: "im-15", productId: "pr-13", type: "adjustment", quantity: -25, date: "2026-08-30", note: "Line discontinued and marked inactive; remaining stock returned to supplier.", reference: "PO-3980" },
  { id: "im-16", productId: "pr-14", type: "restock", quantity: 25, date: "2026-07-01", note: "Initial stock-in.", reference: "PO-4350" },
  { id: "im-17", productId: "pr-15", type: "restock", quantity: 24, date: "2026-07-01", note: "Initial stock-in.", reference: "PO-4350" },
  { id: "im-18", productId: "pr-16", type: "restock", quantity: 12, date: "2026-07-20", note: "Initial stock-in.", reference: "PO-4360" },
  { id: "im-19", productId: "pr-17", type: "restock", quantity: 30, date: "2026-07-01", note: "Initial stock-in.", reference: "PO-4350" },
  { id: "im-20", productId: "pr-18", type: "restock", quantity: 60, date: "2026-07-15", note: "Initial stock-in.", reference: "PO-4390" },
  { id: "im-21", productId: "pr-19", type: "restock", quantity: 15, date: "2026-08-01", note: "Initial stock-in.", reference: "PO-4460" },
  { id: "im-22", productId: "pr-19", type: "adjustment", quantity: -1, date: "2026-09-12", note: "Stock count correction — one unit unaccounted for during cycle count.", reference: "SC-0912" },
  { id: "im-23", productId: "pr-20", type: "restock", quantity: 20, date: "2026-08-01", note: "Initial stock-in.", reference: "PO-4460" },
  { id: "im-24", productId: "pr-21", type: "restock", quantity: 10, date: "2026-08-01", note: "Initial stock-in.", reference: "PO-4460" },
  { id: "im-25", productId: "pr-21", type: "damaged", quantity: -1, date: "2026-09-05", note: "Foam surface split on one unit — pulled from sale.", reference: undefined },
];
