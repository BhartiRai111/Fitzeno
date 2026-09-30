"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseStatusBadge } from "@/components/shared/status-badge";
import { ExpenseDialog, type ExpenseInput } from "@/components/dashboard/dialogs/expense-dialog";
import { ExpenseActionsMenu } from "@/components/dashboard/expense-actions-menu";
import { FinancesOverviewTab } from "@/components/dashboard/finances/overview-tab";

import {
  useExpensesRoster,
  useCreateExpense,
  useUpdateExpense,
  useMarkExpensePaid,
  useCancelExpense,
  useReopenExpense,
  toBackendExpenseInput,
} from "@/hooks/use-expenses";
import { EXPENSE_CATEGORIES } from "@/lib/finance-helpers";
import { ApiError, NetworkError } from "@/lib/api/types";
import { formatCurrency, formatDate } from "@/lib/utils-data";

type TabValue = "overview" | "expenses";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof NetworkError ? err.message : fallback;
}

export function FinancesPageClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) ?? "overview";
  const initialCategory = searchParams.get("category") ?? "all";
  const initialStatus = searchParams.get("status") ?? "all";

  const [tab, setTab] = React.useState<TabValue>(initialTab);
  const { expenses, isLoading, isError } = useExpensesRoster();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const markExpensePaid = useMarkExpensePaid();
  const cancelExpense = useCancelExpense();
  const reopenExpense = useReopenExpense();

  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState(initialCategory);
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [recurringFilter, setRecurringFilter] = React.useState("all");

  async function handleAddExpense(input: ExpenseInput) {
    try {
      await createExpense.mutateAsync(toBackendExpenseInput(input));
      toast.success("Expense recorded", { description: `${input.title} has been added to the ledger.` });
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't record this expense. Please try again."));
    }
  }

  async function handleEditExpense(id: string, input: ExpenseInput) {
    try {
      await updateExpense.mutateAsync({ id, input: toBackendExpenseInput(input) });
      toast.success("Expense updated", { description: `${input.title} has been updated.` });
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't update this expense. Please try again."));
    }
  }

  function handleMarkPaid(id: string) {
    const expense = expenses.find((e) => e.id === id);
    markExpensePaid.mutate(id, {
      onSuccess: () => toast.success(`${expense?.title ?? "Expense"} marked as paid`),
      onError: (err) => toast.error(errorMessage(err, "Couldn't mark this expense as paid. Please try again.")),
    });
  }

  function handleCancel(id: string) {
    const expense = expenses.find((e) => e.id === id);
    cancelExpense.mutate(id, {
      onSuccess: () => toast.success(`${expense?.title ?? "Expense"} cancelled`),
      onError: (err) => toast.error(errorMessage(err, "Couldn't cancel this expense. Please try again.")),
    });
  }

  function handleReopen(id: string) {
    const expense = expenses.find((e) => e.id === id);
    reopenExpense.mutate(id, {
      onSuccess: () => toast.success(`${expense?.title ?? "Expense"} reopened as pending`),
      onError: (err) => toast.error(errorMessage(err, "Couldn't reopen this expense. Please try again.")),
    });
  }

  const filteredExpenses = [...expenses]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((e) => {
      const matchesSearch =
        search.trim().length === 0 ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.vendor ?? "").toLowerCase().includes(search.toLowerCase()) ||
        e.reference.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesRecurring =
        recurringFilter === "all" || (recurringFilter === "recurring" ? e.recurring : !e.recurring);
      return matchesSearch && matchesCategory && matchesStatus && matchesRecurring;
    });

  const paidTotal = filteredExpenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finances"
        description="Expenses, profit and loss, and where the money goes"
        actions={<ExpenseDialog onSave={handleAddExpense} />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinancesOverviewTab />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              startIcon={<Search />}
              placeholder="Search by title, vendor, or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={recurringFilter} onValueChange={setRecurringFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Recurring & one-time</SelectItem>
                <SelectItem value="recurring">Recurring only</SelectItem>
                <SelectItem value="one-time">One-time only</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading expenses…</p>
          ) : isError ? (
            <EmptyState icon={Receipt} title="Couldn't load expenses" description="Check your connection and refresh the page." />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses match these filters"
              description="Try adjusting your search or filters."
              action={{
                label: "Reset filters",
                onClick: () => {
                  setSearch("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setRecurringFilter("all");
                },
              }}
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {filteredExpenses.length} expense{filteredExpenses.length === 1 ? "" : "s"} · {formatCurrency(paidTotal)} paid
              </p>
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Expense</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{expense.title}</p>
                            <p className="text-xs text-muted-foreground">{expense.reference}{expense.vendor ? ` · ${expense.vendor}` : ""}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{expense.category}</td>
                          <td className="px-4 py-3 tabular text-foreground">{formatCurrency(expense.amount)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(expense.date)}
                            {expense.status === "pending" && expense.dueDate && (
                              <span className="block text-xs">due {formatDate(expense.dueDate)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {expense.recurring ? <Badge variant="outline">{expense.frequency}</Badge> : <span className="text-muted-foreground">One-time</span>}
                          </td>
                          <td className="px-4 py-3"><ExpenseStatusBadge status={expense.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <ExpenseActionsMenu
                              expense={expense}
                              onEdit={handleEditExpense}
                              onMarkPaid={handleMarkPaid}
                              onCancel={handleCancel}
                              onReopen={handleReopen}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
