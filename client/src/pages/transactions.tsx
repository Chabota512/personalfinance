import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTransactionsByDateRange } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionListItem } from "@/components/transaction-list-item";
import { TimePeriodFilter, getDateRangeFromPeriod, type TimePeriod } from "@/components/time-period-filter";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Plus, Receipt } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/financial-utils";

// Assuming EXPENSE_CATEGORIES and INCOME_CATEGORIES are defined elsewhere in your project
// For demonstration purposes, let's define them here:
const EXPENSE_CATEGORIES = [
  { id: "groceries", name: "Groceries" },
  { id: "utilities", name: "Utilities" },
  { id: "transportation", name: "Transportation" },
  { id: "dining", name: "Dining Out" },
  { id: "entertainment", name: "Entertainment" },
  { id: "housing", name: "Housing" },
  { id: "other_expenses", name: "Other Expenses" },
];

const INCOME_CATEGORIES = [
  { id: "salary", name: "Salary" },
  { id: "freelance", name: "Freelance" },
  { id: "investment", name: "Investment Income" },
  { id: "gifts", name: "Gifts" },
  { id: "other_income", name: "Other Income" },
];

export default function TransactionsPage() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");

  // State for multi-filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Calculate date range based on selected period
  const { startDate, endDate } = useMemo(() => getDateRangeFromPeriod(timePeriod), [timePeriod]);

  const { data: transactions, isLoading, error, refetch } = useTransactionsByDateRange(startDate, endDate);

  // Auto-refresh on mount to recover from stale data
  useEffect(() => {
    refetch();
  }, []);


  const filteredTransactions = useMemo(() => {
    console.log('Raw transactions:', transactions);
    console.log('Filter states:', { searchTerm, selectedCategory, minAmount, maxAmount, dateFrom, dateTo });

    if (!transactions) {
      console.log('No transactions returned from API');
      return [];
    }

    const filtered = transactions.filter(t => {
      // Search filter
      const matchesSearch = !searchTerm || 
                           t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;

      // Amount filters - use totalAmount instead of amount
      const transactionAmount = parseFloat(t.totalAmount || '0');
      const matchesMinAmount = !minAmount || (transactionAmount >= parseFloat(minAmount));
      const matchesMaxAmount = !maxAmount || (transactionAmount <= parseFloat(maxAmount));

      // Date filters
      const transactionDate = new Date(t.date);
      const matchesDateFrom = !dateFrom || (transactionDate >= new Date(dateFrom));
      const matchesDateTo = !dateTo || (transactionDate <= new Date(dateTo));

      const matches = matchesSearch && matchesCategory && matchesMinAmount && matchesMaxAmount && matchesDateFrom && matchesDateTo;

      if (!matches) {
        console.log('Transaction filtered out:', t.description, {
          matchesSearch, matchesCategory, matchesMinAmount, matchesMaxAmount, matchesDateFrom, matchesDateTo
        });
      }

      return matches;
    });

    console.log('Filtered transactions count:', filtered.length);
    return filtered;
  }, [transactions, searchTerm, selectedCategory, minAmount, maxAmount, dateFrom, dateTo]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-4 text-destructive">Error loading transactions: {error.message}</div>;


  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display-xl md:text-display-2xl font-bold">Transactions</h1>
                <p className="text-body-sm text-muted-foreground">
                  {transactions?.length || 0} transactions
                </p>
              </div>
              <Button onClick={() => {
                setSelectedTransaction(null); // Clear selected transaction for new entry
                setOpen(true);
              }} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <TimePeriodFilter value={timePeriod} onValueChange={setTimePeriod} />
          </div>
        </div>

        {/* Mobile Transaction List */}
        <div className="px-4 py-4 space-y-4">
          {filteredTransactions && filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction: any) => (
              <div
                key={transaction.id}
                onClick={() => {
                  setSelectedTransaction(transaction);
                  setOpen(true);
                }}
                className="bg-card border border-border rounded-xl p-4 active:scale-[0.98] transition-transform"
              >
                <TransactionListItem transaction={transaction} />
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">No transactions yet</p>
                <Button onClick={() => {
                  setSelectedTransaction(null); // Clear selected transaction for new entry
                  setOpen(true);
                }} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Transaction
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <TransactionDialog 
          open={open && !selectedTransaction} 
          onOpenChange={setOpen}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-display-xl md:text-display-2xl font-bold">Transactions</h1>
            <p className="text-body-md text-muted-foreground">
              View and manage your financial transactions
            </p>
          </div>
        <Button onClick={() => {
          setSelectedTransaction(null); // Clear selected transaction for new entry
          setOpen(true);
        }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Transaction
        </Button>
      </div>

      <TimePeriodFilter value={timePeriod} onValueChange={setTimePeriod} />

      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
              {INCOME_CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex gap-2 items-center">
            <Label className="text-sm whitespace-nowrap">Amount:</Label>
            <Input
              type="number"
              placeholder="Min"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-24"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Label className="text-sm whitespace-nowrap">Date Range:</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>

          {(minAmount || maxAmount || dateFrom || dateTo) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMinAmount("");
                setMaxAmount("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>


      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            All Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredTransactions && filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction: any) => (
              <TransactionListItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-body-sm">No transactions in this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog 
          open={open} 
          onOpenChange={setOpen}
        />
      </div>
    </div>
  );
}