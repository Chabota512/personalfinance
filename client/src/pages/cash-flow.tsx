import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ArrowDownCircle, ArrowUpCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getCashFlow, useAccounts } from "@/lib/api";
import { TimePeriodFilter, getDateRangeFromPeriod, type TimePeriod } from "@/components/time-period-filter";
import type { Account } from "@shared/schema";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CashFlowPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const isMobile = useIsMobile();

  // Calculate date range based on selected period
  const { startDate, endDate } = useMemo(() => {
    const range = getDateRangeFromPeriod(timePeriod);
    return {
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    };
  }, [timePeriod]);

  const { data: cashFlowData, isLoading: cashFlowLoading, isError: cashFlowError } = useQuery({
    queryKey: ["/api/analytics/cash-flow", startDate, endDate],
    queryFn: () => getCashFlow(startDate, endDate),
  });

  const { data: accountsData, isLoading: accountsLoading, isError: accountsError } = useAccounts();

  if (cashFlowLoading || accountsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading cash flow...</p>
        </div>
      </div>
    );
  }

  if (cashFlowError || accountsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load cash flow data</p>
        </div>
      </div>
    );
  }

  const totalIncome = cashFlowData?.income || 0;
  const totalExpenses = cashFlowData?.expenses || 0;
  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  // Filter accounts by type for income and expense breakdown
  const accounts = (accountsData as Account[]) || [];
  const incomeAccounts = accounts.filter(acc => acc.accountType === 'income' && acc.isActive === 1);
  const expenseAccounts = accounts.filter(acc => acc.accountType === 'expense' && acc.isActive === 1);

  // Mock monthly data - will be replaced with real historical data later
  const monthlyData = [
    { month: 'Jul', income: totalIncome * 0.93, expenses: totalExpenses * 0.94, net: netCashFlow * 0.91 },
    { month: 'Aug', income: totalIncome * 0.98, expenses: totalExpenses * 1.06, net: netCashFlow * 0.95 },
    { month: 'Sep', income: totalIncome * 0.95, expenses: totalExpenses * 0.91, net: netCashFlow * 0.98 },
    { month: 'Oct', income: totalIncome * 1.00, expenses: totalExpenses * 1.03, net: netCashFlow * 0.96 },
    { month: 'Nov', income: totalIncome * 0.96, expenses: totalExpenses * 0.97, net: netCashFlow * 0.95 },
    { month: 'Dec', income: totalIncome, expenses: totalExpenses, net: netCashFlow },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-display-xl md:text-display-2xl font-bold text-foreground">Cash Flow Statement</h1>
            <p className="text-body-md text-muted-foreground">
              Track money flowing in and out
            </p>
          </div>
        <TimePeriodFilter
          value={timePeriod}
          onValueChange={setTimePeriod}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-elevate" data-testid="card-total-income">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-success/10 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Income</p>
            </div>
            <p className="text-3xl font-bold font-mono text-success" data-testid="value-total-income">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-total-expenses">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
            </div>
            <p className="text-3xl font-bold font-mono text-destructive" data-testid="value-total-expenses">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-net-cash-flow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
            </div>
            <p className={`text-3xl font-bold font-mono ${netCashFlow >= 0 ? 'text-primary' : 'text-destructive'}`} data-testid="value-net-cash-flow">
              {formatCurrency(netCashFlow)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-savings-rate">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gold/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-gold-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Savings Rate</p>
            </div>
            <p className="text-3xl font-bold font-mono text-gold-foreground" data-testid="value-savings-rate">
              {savingsRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Cash Flow Chart */}
      <Card data-testid="chart-cash-flow-trend">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base">Monthly Cash Flow Trend</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 sm:pb-6">
          <div className="h-[250px] sm:h-[350px] md:h-[400px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="income" fill="hsl(var(--success))" name="Income" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" radius={[8, 8, 0, 0]} />
                <Bar dataKey="net" fill="hsl(var(--primary))" name="Net Cash Flow" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Income & Expenses Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-success" />
                Income Sources
              </span>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                {formatCurrency(totalIncome)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomeAccounts.length > 0 ? (
              incomeAccounts.map((account, index) => (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`row-income-${index}`}>
                  <span className="font-medium text-foreground" data-testid={`text-income-category-${index}`}>{account.name}</span>
                  <span className="font-mono font-semibold text-success" data-testid={`value-income-amount-${index}`}>
                    +{formatCurrency(parseFloat(account.balance))}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <p>No income accounts yet</p>
                <p className="text-sm mt-2">Add income accounts to track your income sources</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
                Expenses
              </span>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                {formatCurrency(totalExpenses)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expenseAccounts.length > 0 ? (
              expenseAccounts.map((account, index) => (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate" data-testid={`row-expense-${index}`}>
                  <span className="font-medium text-foreground" data-testid={`text-expense-category-${index}`}>{account.name}</span>
                  <span className="font-mono font-semibold text-destructive" data-testid={`value-expense-amount-${index}`}>
                    -{formatCurrency(parseFloat(account.balance))}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <p>No expense accounts yet</p>
                <p className="text-sm mt-2">Add expense accounts to track your spending categories</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}