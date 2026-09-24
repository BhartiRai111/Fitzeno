"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Wallet,
  ShoppingBag,
  AlertTriangle,
  PackageX,
  Receipt,
  TrendingUp,
  Package,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StockStatusBadge, SaleStatusBadge } from "@/components/shared/status-badge";
import { ProductDialog, type ProductInput } from "@/components/dashboard/dialogs/product-dialog";
import { AdjustStockDialog, type StockAdjustmentInput } from "@/components/dashboard/dialogs/adjust-stock-dialog";
import { SaleReceiptDialog } from "@/components/dashboard/dialogs/sale-receipt-dialog";
import { ProductTile } from "@/components/dashboard/store/product-tile";
import { CartPanel } from "@/components/dashboard/store/cart-panel";
import { ProductDetailSheet } from "@/components/dashboard/store/product-detail-sheet";

import { products as initialProducts } from "@/lib/data/products";
import { storeSales as initialStoreSales } from "@/lib/data/store-sales";
import { inventoryMovements as initialMovements } from "@/lib/data/inventory-movements";
import { suppliers } from "@/lib/data/suppliers";
import { members } from "@/lib/data/members";
import {
  TODAY,
  PRODUCT_CATEGORIES,
  getStockStatus,
  getLowStockProducts,
  computeSaleTotals,
  generateOrderNumber,
  getStoreStats,
  getTopSellingProducts,
  getRevenueByCategory,
  getInventoryValueAtCost,
  getAllMovements,
  getMovementsForProduct,
  getPosTime,
  type CartLine,
} from "@/lib/store-helpers";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import type { Product, StoreSale, ProductCategory } from "@/lib/data/types";

const CURRENT_USER = "Sam Carter";

type TabValue = "overview" | "pos" | "products" | "orders" | "inventory";

export function StorePageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "overview";
  const [tab, setTab] = React.useState<TabValue>(initialTab);

  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [sales, setSales] = React.useState<StoreSale[]>(initialStoreSales);
  const [manualMovements, setManualMovements] = React.useState(initialMovements);

  // POS state
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [posSearch, setPosSearch] = React.useState("");
  const [posCategory, setPosCategory] = React.useState<"all" | ProductCategory>("all");
  const [discountPercent, setDiscountPercent] = React.useState(0);
  const [memberId, setMemberId] = React.useState("walk-in");
  const [paymentMethod, setPaymentMethod] = React.useState<StoreSale["paymentMethod"]>("Card");
  const [checkingOut, setCheckingOut] = React.useState(false);

  // Shared receipt dialog (POS post-checkout + Orders "View")
  const [receiptSaleId, setReceiptSaleId] = React.useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);

  // Product detail sheet
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);
  const [productSheetOpen, setProductSheetOpen] = React.useState(false);

  // Products tab filters
  const [productSearch, setProductSearch] = React.useState("");
  const [productCategoryFilter, setProductCategoryFilter] = React.useState("all");
  const [availabilityFilter, setAvailabilityFilter] = React.useState("active");

  // Orders tab filters
  const [orderSearch, setOrderSearch] = React.useState("");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState("all");

  const movements = React.useMemo(() => getAllMovements(manualMovements, sales), [manualMovements, sales]);
  const stats = React.useMemo(() => getStoreStats(sales, products, TODAY), [sales, products]);
  const topSellers = React.useMemo(() => getTopSellingProducts(sales, products, 5), [sales, products]);
  const categoryRevenue = React.useMemo(() => getRevenueByCategory(sales, products), [sales, products]);
  const lowStockProducts = React.useMemo(() => getLowStockProducts(products), [products]);
  const inventoryValue = React.useMemo(() => getInventoryValueAtCost(products), [products]);

  const receiptSale = sales.find((s) => s.id === receiptSaleId) ?? null;
  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  // ---------------------------------------------------------------------
  // Cart handlers
  // ---------------------------------------------------------------------

  function handleAddToCart(productId: string) {
    setCart((prev) => ({ ...prev, [productId]: 1 }));
  }

  function handleIncrement(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => {
      const current = prev[productId] ?? 0;
      if (current >= product.stock) {
        toast.error("Not enough stock", { description: `Only ${product.stock} of ${product.name} available.` });
        return prev;
      }
      return { ...prev, [productId]: current + 1 };
    });
  }

  function handleDecrement(productId: string) {
    setCart((prev) => {
      const current = prev[productId] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  }

  function handleRemoveFromCart(productId: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function resetCheckoutState() {
    setCart({});
    setDiscountPercent(0);
    setMemberId("walk-in");
    setPaymentMethod("Card");
  }

  function handleCancelSale() {
    resetCheckoutState();
    toast("Sale cancelled", { description: "The cart has been cleared." });
  }

  const cartLines: CartLine[] = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter((line): line is CartLine => line !== null);

  const totals = computeSaleTotals(cartLines, discountPercent);

  function handleCompleteSale() {
    if (cartLines.length === 0) return;
    setCheckingOut(true);
    setTimeout(() => {
      const member = members.find((m) => m.id === memberId);
      const newSale: StoreSale = {
        id: `ss-${Date.now()}`,
        orderNumber: generateOrderNumber(sales),
        items: cartLines.map((line) => ({
          productId: line.product.id,
          name: line.product.name,
          unitPrice: line.product.price,
          quantity: line.quantity,
        })),
        subtotal: totals.subtotal,
        discountPercent,
        discountAmount: totals.discountAmount,
        tax: totals.tax,
        total: totals.total,
        paymentMethod,
        status: "completed",
        memberId: member?.id,
        memberName: member?.name,
        soldBy: CURRENT_USER,
        date: TODAY,
        time: getPosTime(),
      };

      setProducts((prev) =>
        prev.map((p) => {
          const line = cartLines.find((l) => l.product.id === p.id);
          return line ? { ...p, stock: Math.max(0, p.stock - line.quantity) } : p;
        })
      );
      setSales((prev) => [newSale, ...prev]);
      setCheckingOut(false);
      resetCheckoutState();
      setReceiptSaleId(newSale.id);
      setReceiptOpen(true);
      toast.success("Sale completed", { description: `${newSale.orderNumber} · ${formatCurrency(newSale.total)}` });
    }, 700);
  }

  function handleRefundSale(saleId: string) {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, status: "refunded" } : s)));
    setProducts((prev) =>
      prev.map((p) => {
        const item = sale.items.find((i) => i.productId === p.id);
        return item ? { ...p, stock: p.stock + item.quantity } : p;
      })
    );
    toast.success(`Refund issued for ${sale.orderNumber}`, {
      description: `${formatCurrency(sale.total)} returned · items restocked.`,
    });
  }

  function openReceipt(saleId: string) {
    setReceiptSaleId(saleId);
    setReceiptOpen(true);
  }

  // ---------------------------------------------------------------------
  // Product / inventory handlers
  // ---------------------------------------------------------------------

  function handleAddProduct(input: ProductInput) {
    const newProduct: Product = {
      id: `pr-${Date.now()}`,
      name: input.name,
      sku: input.sku,
      category: input.category,
      description: input.description,
      price: input.price,
      cost: input.cost,
      stock: input.stock ?? 0,
      lowStockThreshold: input.lowStockThreshold,
      supplierId: input.supplierId,
      active: input.active,
      createdOn: TODAY,
    };
    setProducts((prev) => [newProduct, ...prev]);
    if (newProduct.stock > 0) {
      setManualMovements((prev) => [
        { id: `mv-${Date.now()}`, productId: newProduct.id, type: "restock", quantity: newProduct.stock, date: TODAY, note: "Initial stock-in for new product.", reference: undefined },
        ...prev,
      ]);
    }
  }

  function handleUpdateProduct(productId: string, input: ProductInput) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, name: input.name, sku: input.sku, category: input.category, description: input.description, price: input.price, cost: input.cost, lowStockThreshold: input.lowStockThreshold, supplierId: input.supplierId, active: input.active }
          : p
      )
    );
  }

  function handleAdjustStock(productId: string, input: StockAdjustmentInput) {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock + input.quantity) } : p))
    );
    setManualMovements((prev) => [
      { id: `mv-${Date.now()}`, productId, type: input.type, quantity: input.quantity, date: TODAY, note: input.note, reference: undefined },
      ...prev,
    ]);
  }

  function handleToggleActive(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, active: !p.active } : p)));
    toast.success(product.active ? `${product.name} discontinued` : `${product.name} reactivated`, {
      description: product.active ? "Hidden from the POS. Existing history is kept." : "Now available for sale again.",
    });
  }

  function openProduct(productId: string) {
    setSelectedProductId(productId);
    setProductSheetOpen(true);
  }

  // ---------------------------------------------------------------------
  // Derived filtered lists
  // ---------------------------------------------------------------------

  const posProducts = products
    .filter((p) => p.active)
    .filter((p) => posCategory === "all" || p.category === posCategory)
    .filter((p) => posSearch.trim().length === 0 || p.name.toLowerCase().includes(posSearch.toLowerCase()) || p.sku.toLowerCase().includes(posSearch.toLowerCase()));

  const filteredProducts = products
    .filter((p) => availabilityFilter === "all" || (availabilityFilter === "active" ? p.active : !p.active))
    .filter((p) => productCategoryFilter === "all" || p.category === productCategoryFilter)
    .filter((p) => productSearch.trim().length === 0 || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()));

  const filteredOrders = sales
    .filter((s) => orderStatusFilter === "all" || s.status === orderStatusFilter)
    .filter(
      (s) =>
        orderSearch.trim().length === 0 ||
        s.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        (s.memberName ?? "walk-in").toLowerCase().includes(orderSearch.toLowerCase())
    );

  const inventoryProducts = [...products]
    .filter((p) => p.active)
    .sort((a, b) => {
      const rank = { "out-of-stock": 0, "low-stock": 1, "in-stock": 2 } as const;
      return rank[getStockStatus(a)] - rank[getStockStatus(b)] || a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store"
        description="Point of sale, product catalog, and inventory"
        actions={<ProductDialog onSave={handleAddProduct} />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pos">Point of Sale</TabsTrigger>
          <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({sales.length})</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- */}
        {/* Overview */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={Wallet} helpText={`${stats.todayOrders} orders`} />
            <StatCard label="This Month" value={formatCurrency(stats.monthRevenue)} icon={TrendingUp} helpText={`${stats.monthOrders} orders`} />
            <StatCard label="Avg Order Value" value={formatCurrency(stats.avgOrderValue)} icon={Receipt} helpText="this month" />
            <StatCard label="Low Stock" value={stats.lowStockCount.toString()} icon={AlertTriangle} helpText="products" />
            <StatCard label="Out of Stock" value={stats.outOfStockCount.toString()} icon={PackageX} helpText="products" />
            <StatCard label="Inventory Value" value={formatCurrency(inventoryValue)} icon={Package} helpText="at cost" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top selling products</CardTitle>
                <CardDescription>By revenue, all time</CardDescription>
              </CardHeader>
              <CardContent>
                {topSellers.length === 0 ? (
                  <EmptyState icon={TrendingUp} title="No sales yet" description="Completed sales will show your best sellers here." />
                ) : (
                  <div className="space-y-1">
                    {topSellers.map((item, index) => (
                      <div key={item.productId} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.unitsSold} sold · {item.category}</p>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular text-foreground">{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by category</CardTitle>
                <CardDescription>Where store revenue comes from</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryRevenue.length === 0 ? (
                  <EmptyState icon={ShoppingBag} title="No sales yet" description="Category performance will appear once sales come in." />
                ) : (
                  <div className="space-y-3.5">
                    {categoryRevenue.map((cat) => (
                      <div key={cat.category}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{cat.category}</span>
                          <span className="font-medium tabular text-foreground">{formatCurrency(cat.revenue)} · {cat.share}%</span>
                        </div>
                        <Progress value={cat.share} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Needs restocking</CardTitle>
                  <CardDescription>Low and out-of-stock products</CardDescription>
                </div>
                <CardAction>
                  <Button variant="ghost" size="sm" onClick={() => setTab("inventory")}>
                    View all
                    <ArrowRight className="size-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {lowStockProducts.length === 0 ? (
                  <EmptyState icon={Package} title="All stocked up" description="No products are running low right now." />
                ) : (
                  <div className="space-y-1">
                    {lowStockProducts.slice(0, 6).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => openProduct(product.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.stock} remaining</p>
                        </div>
                        <StockStatusBadge status={getStockStatus(product)} />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Recent orders</CardTitle>
                <CardAction>
                  <Button variant="ghost" size="sm" onClick={() => setTab("orders")}>
                    View all
                    <ArrowRight className="size-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <EmptyState icon={Receipt} title="No orders yet" description="Sales completed at the till will show up here." />
                ) : (
                  <div className="space-y-1">
                    {sales.slice(0, 6).map((sale) => (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => openReceipt(sale.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{sale.orderNumber} · {sale.memberName ?? "Walk-in"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(sale.date)} · {sale.paymentMethod}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-medium tabular text-foreground">{formatCurrency(sale.total)}</span>
                          <SaleStatusBadge status={sale.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Point of Sale */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="pos">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  startIcon={<Search />}
                  placeholder="Search products or SKU..."
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  className="sm:max-w-xs"
                />
                <div className="flex flex-1 flex-wrap gap-1.5">
                  <Button size="sm" variant={posCategory === "all" ? "primary" : "outline"} onClick={() => setPosCategory("all")}>
                    All
                  </Button>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <Button key={cat} size="sm" variant={posCategory === cat ? "primary" : "outline"} onClick={() => setPosCategory(cat)}>
                      {cat}
                    </Button>
                  ))}
                </div>
              </Card>

              {posProducts.length === 0 ? (
                <EmptyState icon={Search} title="No products match" description="Try a different search or category." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {posProducts.map((product) => (
                    <ProductTile
                      key={product.id}
                      product={product}
                      quantityInCart={cart[product.id] ?? 0}
                      onAdd={handleAddToCart}
                      onIncrement={handleIncrement}
                      onDecrement={handleDecrement}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <CartPanel
                lines={cartLines}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onRemove={handleRemoveFromCart}
                members={members}
                memberId={memberId}
                onMemberChange={setMemberId}
                discountPercent={discountPercent}
                onDiscountPercentChange={setDiscountPercent}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                totals={totals}
                onCompleteSale={handleCompleteSale}
                onCancelSale={handleCancelSale}
                submitting={checkingOut}
              />
            </div>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Products */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="products" className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              startIcon={<Search />}
              placeholder="Search by name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Sold in store</SelectItem>
                <SelectItem value="inactive">Discontinued</SelectItem>
                <SelectItem value="all">All products</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No products match these filters"
              description="Try adjusting your search or filters."
              action={{ label: "Reset filters", onClick: () => { setProductSearch(""); setProductCategoryFilter("all"); setAvailabilityFilter("active"); } }}
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const supplier = suppliers.find((s) => s.id === product.supplierId);
                      return (
                        <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                          <td className="px-4 py-3 tabular text-foreground">{formatCurrency(product.price)}</td>
                          <td className="px-4 py-3 tabular text-muted-foreground">{product.stock}</td>
                          <td className="px-4 py-3">
                            {product.active ? <StockStatusBadge status={getStockStatus(product)} /> : <Badge variant="default">Discontinued</Badge>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{supplier?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => openProduct(product.id)}>View</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Orders */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="orders" className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              startIcon={<Search />}
              placeholder="Search by order # or customer..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {filteredOrders.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No orders match these filters"
              description="Try adjusting your search or filters."
              action={{ label: "Reset filters", onClick: () => { setOrderSearch(""); setOrderStatusFilter("all"); } }}
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Items</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((sale) => (
                      <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{sale.orderNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{sale.memberName ?? "Walk-in customer"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{sale.items.reduce((s, i) => s + i.quantity, 0)}</td>
                        <td className="px-4 py-3 tabular text-foreground">{formatCurrency(sale.total)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{sale.paymentMethod}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(sale.date)}</td>
                        <td className="px-4 py-3"><SaleStatusBadge status={sale.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openReceipt(sale.id)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Inventory */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>Who restocks the shelves</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{supplier.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{supplier.contactName}</p>
                    <p className="text-xs text-muted-foreground">{supplier.leadTimeDays}-day lead time</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock levels</CardTitle>
              <CardDescription>Lowest stock first</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Low stock at</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryProducts.map((product) => (
                      <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                        <td className="px-4 py-3 tabular text-foreground">{product.stock}</td>
                        <td className="px-4 py-3 tabular text-muted-foreground">{product.lowStockThreshold}</td>
                        <td className="px-4 py-3"><StockStatusBadge status={getStockStatus(product)} /></td>
                        <td className="px-4 py-3 text-right">
                          <AdjustStockDialog
                            product={product}
                            onAdjust={(input) => handleAdjustStock(product.id, input)}
                            trigger={<Button size="sm" variant="ghost">Adjust</Button>}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movement history</CardTitle>
              <CardDescription>Restocks, sales, returns, and corrections</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <EmptyState icon={Package} title="No movements yet" description="Stock activity will show up here." />
              ) : (
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Qty</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => {
                        const product = products.find((p) => p.id === movement.productId);
                        return (
                          <tr key={movement.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3 text-foreground">{product?.name ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground capitalize">{movement.type}</td>
                            <td className={`px-4 py-3 tabular font-medium ${movement.quantity > 0 ? "text-success" : "text-danger"}`}>
                              {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(movement.date)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{movement.note}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SaleReceiptDialog sale={receiptSale} open={receiptOpen} onOpenChange={setReceiptOpen} onRefund={handleRefundSale} />

      <ProductDetailSheet
        product={selectedProduct}
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        supplier={suppliers.find((s) => s.id === selectedProduct?.supplierId)}
        sales={sales}
        movements={selectedProduct ? getMovementsForProduct(movements, selectedProduct.id) : []}
        onSaveProduct={(input) => selectedProduct && handleUpdateProduct(selectedProduct.id, input)}
        onAdjustStock={(input) => selectedProduct && handleAdjustStock(selectedProduct.id, input)}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}
