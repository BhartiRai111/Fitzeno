"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Search, Wallet, Clock, XCircle, RotateCcw, Receipt, PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { RecordPaymentDialog, type RecordPaymentInput } from "@/components/dashboard/dialogs/record-payment-dialog";
import { ConfirmActionDialog } from "@/components/dashboard/dialogs/confirm-action-dialog";
import { InvoiceDialog } from "@/components/dashboard/dialogs/invoice-dialog";
import { payments as initialPayments, revenueByMonth } from "@/lib/data/payments";
import { formatCurrency, formatDate } from "@/lib/utils-data";
import type { Payment } from "@/lib/data/types";

const TODAY = "2026-09-21";

type TabValue = "transactions" | "pending" | "membership" | "refunds" | "invoices";

function PaymentsTable({
  rows,
  showRefund = false,
  onRefund,
}: {
  rows: Payment[];
  showRefund?: boolean;
  onRefund: (paymentId: string) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={Receipt} title="No payments here" description="Nothing matches this view yet." />;
  }
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((payment) => (
              <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{payment.memberInitials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{payment.memberName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{payment.plan}</td>
                <td className="px-4 py-3 tabular text-foreground">{formatCurrency(payment.amount)}</td>
                <td className="px-4 py-3 text-muted-foreground">{payment.method}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.date)}</td>
                <td className="px-4 py-3"><PaymentStatusBadge status={payment.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{payment.invoiceId}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <InvoiceDialog payment={payment} trigger={<Button size="sm" variant="ghost">View</Button>} />
                    {showRefund && payment.status === "paid" && (
                      <ConfirmActionDialog
                        trigger={<Button size="sm" variant="ghost" className="text-destructive">Refund</Button>}
                        title={`Refund ${formatCurrency(payment.amount)} to ${payment.memberName}?`}
                        description="This reverses the charge back to their original payment method."
                        confirmLabel="Issue Refund"
                        destructive
                        onConfirm={() => onRefund(payment.id)}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function PaymentsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "transactions";
  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [payments, setPayments] = React.useState<Payment[]>(initialPayments);

  function handleRecord(input: RecordPaymentInput) {
    const newPayment: Payment = {
      id: `p-${Date.now()}`,
      invoiceId: `INV-${10300 + payments.length}`,
      date: TODAY,
      status: "paid",
      ...input,
    };
    setPayments((prev) => [newPayment, ...prev]);
  }

  function handleRefund(paymentId: string) {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "refunded" } : p)));
    toast.success(`Refund issued for ${payment.invoiceId}`, {
      description: `${formatCurrency(payment.amount)} returned to ${payment.memberName}.`,
    });
  }

  const totalRevenue = revenueByMonth[revenueByMonth.length - 1].revenue;
  const pendingAmount = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const failedCount = payments.filter((p) => p.status === "failed").length;
  const refundedAmount = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

  const searched = (rows: Payment[]) =>
    rows.filter((p) => {
      const matchesSearch = search.trim().length === 0 || p.memberName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  const transactions = searched(payments);
  const pending = searched(payments.filter((p) => p.status === "pending" || p.status === "failed"));
  const membershipPayments = searched(payments.filter((p) => p.category === "Membership"));
  const refunds = searched(payments.filter((p) => p.status === "refunded"));
  const invoices = searched(payments);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Billing"
        description="Transactions, invoices, and billing health"
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/owner/finances">
                <PiggyBank className="size-4" />
                View Finances
              </Link>
            </Button>
            <RecordPaymentDialog onRecord={handleRecord} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue This Month" value={formatCurrency(totalRevenue)} icon={Wallet} />
        <StatCard label="Pending Amount" value={formatCurrency(pendingAmount)} icon={Clock} />
        <StatCard label="Failed Payments" value={failedCount.toString()} icon={XCircle} />
        <StatCard label="Refunds" value={formatCurrency(refundedAmount)} icon={RotateCcw} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="membership">Membership Payments</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              startIcon={<Search />}
              placeholder="Search by member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {tab === "transactions" && <PaymentsTable rows={transactions} showRefund onRefund={handleRefund} />}
          {tab === "pending" && <PaymentsTable rows={pending} onRefund={handleRefund} />}
          {tab === "membership" && <PaymentsTable rows={membershipPayments} showRefund onRefund={handleRefund} />}
          {tab === "refunds" && <PaymentsTable rows={refunds} onRefund={handleRefund} />}
          {tab === "invoices" && <PaymentsTable rows={invoices} onRefund={handleRefund} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
