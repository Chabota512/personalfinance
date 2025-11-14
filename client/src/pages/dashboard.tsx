import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { TransactionListItem } from "@/components/transaction-list-item";
import { TransactionDialog } from "@/components/transaction-dialog";
import { QuickDealForm } from "@/components/quick-deal-form";
import { RecurringIncomeReminder } from "@/components/recurring-income-reminder";
import { FinancialHealthBreakdown } from "@/components/financial-health-breakdown";
import { BalanceChart } from "@/components/balance-chart";
import { TimePeriodFilter, getDateRangeFromPeriod, type TimePeriod } from "@/components/time-period-filter";
import { formatCurrency, calculateGoalProgress } from "@/lib/financial-utils";
import { 
  useFinancialHealthScore, 
  useNetWorth, 
  useNetWorthHistory,
  useCashFlow, 
  useTransactionsByDateRange,
  useCategorySpending,
  useActiveGoals,
  useActiveBudgets,
  useSavingsRecommendations,
  useBalanceHistory
} from "@/lib/api";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign, 
  Target, 
  Receipt, 
  PieChart as PieChartIcon, 
  Sparkles,
  BarChart3,
  ArrowRight,
  ChevronDown,
  Eye,
  LineChart as LineChartIcon,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);

  const { startDate, endDate } = useMemo(() => getDateRangeFromPeriod(timePeriod), [timePeriod]);

  const { data: healthScore, isLoading: healthLoading } = useFinancialHealthScore();
  const { data: netWorthData, isLoading: netWorthLoading } = useNetWorth();
  const { data: netWorthHistory, isLoading: netWorthHistoryLoading } = useNetWorthHistory(12);
  const { data: balanceHistory, isLoading: balanceHistoryLoading } = useBalanceHistory(30);
  const { data: transactions, isLoading: transactionsLoading } = useTransactionsByDateRange(startDate, endDate);
  const { data: activeGoals, isLoading: goalsLoading } = useActiveGoals();
  const { data: activeBudgets, isLoading: budgetsLoading } = useActiveBudgets();
  const { data: recommendations, isLoading: recsLoading } = useSavingsRecommendations();
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlow(startDate, endDate);
  const { data: categorySpending, isLoading: categoryLoading } = useCategorySpending(startDate, endDate);

  // Check if user is new (no transactions, budgets, or goals)
  const isNewUser = !transactionsLoading && !goalsLoading && !budgetsLoading 
    && (!transactions || transactions.length === 0)
    && (!activeGoals || activeGoals.length === 0)
    && (!activeBudgets || activeBudgets.length === 0);

  const topCategories = useMemo(() => {
    if (!categorySpending || !Array.isArray(categorySpending)) return [];
    return categorySpending
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 5)
      .map((cat: any) => ({ name: cat.category || 'Other', value: cat.total }));
  }, [categorySpending]);

  const getGradeBadgeVariant = (grade: string) => {
    if (grade === 'Excellent' || grade === 'Good') return 'default';
    return 'secondary';
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const budgetHealth = useMemo(() => {
    if (!activeBudgets || activeBudgets.length === 0) return null;
    const onTrackBudgets = activeBudgets.filter((b: any) => {
      const spent = parseFloat(b.spent || 0);
      const allocated = parseFloat(b.amount);
      return (spent / allocated) <= 0.8;
    });
    return Math.round((onTrackBudgets.length / activeBudgets.length) * 100);
  }, [activeBudgets]);

  const incomeExpensesTrend = useMemo(() => {
    if (!transactions) return [];
    const monthsData: Record<string, { income: number; expenses: number; savings: number }> = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    transactions
      .filter((t: any) => new Date(t.date) >= sixMonthsAgo)
      .forEach((t: any) => {
        const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const amount = parseFloat(t.totalAmount);
        if (!monthsData[month]) {
          monthsData[month] = { income: 0, expenses: 0, savings: 0 };
        }
        if (amount > 0) {
          monthsData[month].income += amount;
        } else {
          monthsData[month].expenses += Math.abs(amount);
        }
      });

    return Object.entries(monthsData)
      .map(([month, data]) => ({ 
        month, 
        income: data.income, 
        expenses: data.expenses,
        savings: data.income - data.expenses
      }))
      .slice(-6);
  }, [transactions]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        {/* Fixed Header with Gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-primary/10 via-background/70 to-transparent backdrop-blur-md border-b border-border/50">
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display-xl md:text-display-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-body-sm text-muted-foreground">Your financial overview</p>
              </div>
              <Button onClick={() => setTransactionDialogOpen(true)} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <TimePeriodFilter value={timePeriod} onValueChange={setTimePeriod} />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-4 py-4 space-y-4">

          {/* Financial Health - Floating Hero Card */}
          <div 
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl p-5 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setShowBreakdown(true)}
          >
            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : healthScore ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-7xl font-black mb-2">{healthScore.score}</div>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {healthScore.grade}
                    </Badge>
                  </div>
                  <Sparkles className="h-8 w-8 opacity-80" />
                </div>
                <Progress value={healthScore.score} className="h-3 bg-white/20" />
                <p className="text-sm text-white/90 leading-relaxed">{healthScore.explanation}</p>
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <Eye className="h-3 w-3" />
                  <span>Tap for detailed breakdown</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <Sparkles className="h-10 w-10 mx-auto opacity-80" />
                <div>
                  <div className="text-2xl font-bold mb-1">Ready to Start?</div>
                  <p className="text-white/80 text-sm">Record some transactions to unlock your financial health score</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats - Horizontal Scroll Cards */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {/* Net Worth */}
            <div className="flex-shrink-0 w-44 bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Wallet className="h-4 w-4 text-success" />
                </div>
                <span className="text-xs text-muted-foreground">Net Worth</span>
              </div>
              {netWorthLoading ? (
                <div className="h-8 animate-pulse bg-muted rounded" />
              ) : (
                <div className="text-xl font-bold">{formatCurrency(netWorthData?.netWorth || 0)}</div>
              )}
            </div>

            {/* Cash Flow */}
            <div className="flex-shrink-0 w-44 bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Cash Flow</span>
              </div>
              {cashFlowLoading ? (
                <div className="h-8 animate-pulse bg-muted rounded" />
              ) : cashFlowData ? (
                <div className={`text-xl font-bold ${cashFlowData.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(cashFlowData.netCashFlow)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>

            {/* Active Goals Count */}
            <div className="flex-shrink-0 w-44 bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <Target className="h-4 w-4 text-chart-2" />
                </div>
                <span className="text-xs text-muted-foreground">Active Goals</span>
              </div>
              <div className="text-xl font-bold">{activeGoals?.length || 0}</div>
            </div>

            {/* Active Budgets Count */}
            <div className="flex-shrink-0 w-44 bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-chart-3" />
                </div>
                <span className="text-xs text-muted-foreground">Budgets</span>
              </div>
              <div className="text-xl font-bold">{activeBudgets?.length || 0}</div>
            </div>
          </div>

          {/* Balance Over Time Chart */}
          <BalanceChart 
            data={balanceHistory || []}
            currentBalance={parseFloat(netWorthData?.netWorth || 0)}
            isLoading={balanceHistoryLoading}
          />

          {/* Recent Transactions - Compact List */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="divide-y divide-border">
                  {transactions.slice(0, 4).map((transaction: any) => (
                    <div key={transaction.id} className="p-3">
                      <TransactionListItem transaction={transaction} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spending Breakdown - Collapsible */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('spending')}
              className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <PieChartIcon className="h-5 w-5 text-chart-3" />
                </div>
                <span className="font-semibold">Spending Breakdown</span>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedSection === 'spending' ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === 'spending' && (
              <Card className="overflow-hidden animate-in slide-in-from-top-2">
                <CardContent className="p-4">
                  {categoryLoading ? (
                    <div className="h-48 animate-pulse bg-muted rounded" />
                  ) : topCategories.length > 0 ? (
                    <div className="space-y-4">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={topCategories}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={60}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {topCategories.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {topCategories.map((cat: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="capitalize">{cat.name}</span>
                            </div>
                            <span className="font-semibold">{formatCurrency(cat.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Goals Section - Collapsible */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('goals')}
              className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Target className="h-5 w-5 text-success" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block">Goals</span>
                  <span className="text-xs text-muted-foreground">{activeGoals?.length || 0} active</span>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedSection === 'goals' ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === 'goals' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                {goalsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 animate-pulse bg-muted rounded-xl" />
                    ))}
                  </div>
                ) : activeGoals && activeGoals.length > 0 ? (
                  <>
                    {activeGoals.slice(0, 3).map((goal: any) => (
                      <Card key={goal.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">{goal.name}</h4>
                            <span className="text-xs font-medium text-primary">
                              {calculateGoalProgress(parseFloat(goal.currentAmount), parseFloat(goal.targetAmount)).toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={calculateGoalProgress(parseFloat(goal.currentAmount), parseFloat(goal.targetAmount))} 
                            className="h-2 mb-2" 
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {formatCurrency(parseFloat(goal.currentAmount))}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(parseFloat(goal.targetAmount))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Link href="/goals">
                      <Button variant="outline" size="sm" className="w-full">
                        View All Goals
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Target className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">No goals yet</p>
                      <Link href="/goals">
                        <Button size="sm" variant="outline">Create Goal</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Budgets Section - Collapsible */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('budgets')}
              className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-chart-2" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block">Budgets</span>
                  <span className="text-xs text-muted-foreground">{activeBudgets?.length || 0} active</span>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedSection === 'budgets' ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === 'budgets' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                {budgetsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 animate-pulse bg-muted rounded-xl" />
                    ))}
                  </div>
                ) : activeBudgets && activeBudgets.length > 0 ? (
                  <>
                    {activeBudgets.slice(0, 3).map((budget: any) => {
                      const spent = parseFloat(budget.spent || 0);
                      const allocated = parseFloat(budget.amount);
                      const percentage = (spent / allocated) * 100;
                      const remaining = allocated - spent;

                      return (
                        <Card key={budget.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm">{budget.category}</h4>
                              <Badge variant={percentage > 100 ? 'destructive' : percentage > 80 ? 'secondary' : 'default'}>
                                {percentage.toFixed(0)}%
                              </Badge>
                            </div>
                            <Progress value={Math.min(percentage, 100)} className="h-2 mb-2" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Spent: {formatCurrency(spent)}
                              </span>
                              <span className={remaining >= 0 ? 'text-success' : 'text-destructive'}>
                                Left: {formatCurrency(remaining)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    <Link href="/budget">
                      <Button variant="outline" size="sm" className="w-full">
                        View All Budgets
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">No budgets yet</p>
                      <Link href="/budget">
                        <Button size="sm" variant="outline">Create Budget</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* AI Insights - Always Visible */}
          {recommendations && recommendations.length > 0 && (
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.slice(0, 2).map((rec: any, index: number) => (
                  <div key={index} className="p-3 bg-card rounded-lg border border-purple-500/10">
                    <h4 className="font-semibold text-sm mb-1">{rec.title || 'Tip'}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {rec.description || rec.message}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Net Worth Trend - Minimal Chart */}
          {netWorthHistory && netWorthHistory.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Net Worth Trend</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={netWorthHistory}>
                      <Line 
                        type="monotone" 
                        dataKey="netWorth" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card border border-border rounded-md p-2 shadow-lg">
                                <p className="text-xs text-muted-foreground">{payload[0].payload.month}</p>
                                <p className="text-sm font-semibold">{formatCurrency(payload[0].value as number)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        <FinancialHealthBreakdown 
          open={showBreakdown}
          onOpenChange={setShowBreakdown}
          healthData={healthScore}
        />

        <TransactionDialog 
          open={transactionDialogOpen}
          onOpenChange={setTransactionDialogOpen}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <PageHeader
        title="Financial Dashboard"
        description="Your complete financial overview"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button onClick={() => setTransactionDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Record a Transaction
            </Button>
            <TimePeriodFilter value={timePeriod} onValueChange={setTimePeriod} />
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">

        {/* Desktop: Full Layout (hidden on mobile) */}
        <div className="hidden md:block space-y-4">
          {/* First-time user welcome */}
          {isNewUser && (
            <Card className="border-primary bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Welcome to PersonalFinance Pro!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by taking one of these quick actions:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button onClick={() => setTransactionDialogOpen(true)} variant="outline" className="justify-start">
                    <Receipt className="h-4 w-4 mr-2" />
                    Record First Transaction
                  </Button>
                  <Link href="/budget-wizard">
                    <Button variant="outline" className="w-full justify-start">
                      <PieChartIcon className="h-4 w-4 mr-2" />
                      Create a Budget
                    </Button>
                  </Link>
                  <Link href="/goals">
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="h-4 w-4 mr-2" />
                      Set Your First Goal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Top Section: Vital Signs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="hover-elevate active-elevate-2 col-span-2 cursor-pointer" 
              onClick={() => setShowBreakdown(true)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Financial Health Score
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Eye className="h-4 w-4 text-muted-foreground cursor-help ml-auto" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>A comprehensive score (0-100) based on your savings rate, debt levels, budget adherence, and emergency fund. Higher is better!</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {healthLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : healthScore ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-5xl font-bold text-foreground">
                        {healthScore.score}
                      </div>
                      <Badge variant={getGradeBadgeVariant(healthScore.grade)} className="text-sm">
                        {healthScore.grade}
                      </Badge>
                    </div>
                    <Progress value={healthScore.score} className="h-2" />
                    <p className="text-sm text-muted-foreground">{healthScore.explanation}</p>
                    <p className="text-xs text-primary font-medium">Click for breakdown</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">Start tracking to see your score</p>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-success" />
                  Net Worth
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {netWorthLoading ? (
                  <div className="h-16 animate-pulse bg-muted rounded" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-foreground">
                      {formatCurrency(netWorthData?.netWorth || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Assets - Liabilities</p>
                    {netWorthHistoryLoading ? (
                      <div className="h-24 mt-4 animate-pulse bg-muted rounded" />
                    ) : netWorthHistory && netWorthHistory.length > 0 ? (
                      <div className="mt-4 h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={netWorthHistory}>
                            <Line 
                              type="monotone" 
                              dataKey="netWorth" 
                              stroke="hsl(var(--success))" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-card border border-border rounded-md p-2 shadow-lg">
                                      <p className="text-xs text-muted-foreground">{payload[0].payload.month}</p>
                                      <p className="text-sm font-semibold">{formatCurrency(payload[0].value as number)}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-4">Not enough data</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  This Month's Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {cashFlowLoading ? (
                  <div className="h-16 animate-pulse bg-muted rounded" />
                ) : cashFlowData ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className={`text-2xl font-bold ${cashFlowData.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(cashFlowData.netCashFlow)}
                      </div>
                      {cashFlowData.netCashFlow >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <div>Income: {formatCurrency(cashFlowData.income)}</div>
                      <div>Expenses: {formatCurrency(cashFlowData.expenses)}</div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-chart-2" />
                  Budget Health
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {budgetsLoading ? (
                  <div className="h-16 animate-pulse bg-muted rounded" />
                ) : budgetHealth !== null ? (
                  <>
                    <div className="text-3xl font-bold text-foreground">{budgetHealth}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeBudgets?.length || 0} active budgets
                    </p>
                    <Progress value={budgetHealth} className="h-2 mt-2" />
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No budgets yet</p>
                    <Link href="/budget">
                      <Button size="sm" variant="outline">Create Budget</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Balance Over Time Chart - Full Width */}
          <BalanceChart 
            data={balanceHistory || []}
            currentBalance={parseFloat(netWorthData?.netWorth || 0)}
            isLoading={balanceHistoryLoading}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Recent Transactions
                  </CardTitle>
                  <Link href="/transactions">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {transactions.slice(0, 8).map((transaction: any) => (
                      <TransactionListItem key={transaction.id} transaction={transaction} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No transactions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-chart-3" />
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {categoryLoading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : topCategories.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {topCategories.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-chart-4" />
                  Income vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {transactionsLoading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : incomeExpensesTrend.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={incomeExpensesTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="hsl(var(--success))" strokeWidth={2} name="Income" />
                        <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} name="Expenses" />
                        <Line type="monotone" dataKey="savings" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" name="Net Savings" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <LineChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Not enough data</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Goals & Budgets Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5 text-success" />
                    Active Goals
                  </CardTitle>
                  <Link href="/goals">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                {goalsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : activeGoals && activeGoals.length > 0 ? (
                  <div className="space-y-3">
                    {activeGoals.slice(0, 4).map((goal: any) => (
                      <div key={goal.id} className="p-4 border border-border rounded-lg hover-elevate">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">{goal.name}</h4>
                          <span className="text-xs text-muted-foreground">
                            {calculateGoalProgress(parseFloat(goal.currentAmount), parseFloat(goal.targetAmount)).toFixed(0)}%
                          </span>
                        </div>
                        <Progress 
                          value={calculateGoalProgress(parseFloat(goal.currentAmount), parseFloat(goal.targetAmount))} 
                          className="h-2 mb-2" 
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {formatCurrency(parseFloat(goal.currentAmount))}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(parseFloat(goal.targetAmount))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">No active goals yet</p>
                    <Link href="/goals">
                      <Button size="sm" variant="outline">Create Your First Goal</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-chart-2" />
                    Budget Overview
                  </CardTitle>
                  <Link href="/budget">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                {budgetsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : activeBudgets && activeBudgets.length > 0 ? (
                  <div className="space-y-3">
                    {activeBudgets.slice(0, 3).map((budget: any) => {
                      const spent = parseFloat(budget.spent || 0);
                      const allocated = parseFloat(budget.amount);
                      const percentage = (spent / allocated) * 100;
                      const remaining = allocated - spent;

                      return (
                        <div key={budget.id} className="p-4 border border-border rounded-lg hover-elevate">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">{budget.category}</h4>
                            <Badge variant={percentage > 100 ? 'destructive' : percentage > 80 ? 'secondary' : 'default'}>
                              {percentage.toFixed(0)}%
                            </Badge>
                          </div>
                          <Progress value={Math.min(percentage, 100)} className="h-2 mb-2" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Spent: {formatCurrency(spent)}
                            </span>
                            <span className={remaining >= 0 ? 'text-success' : 'text-destructive'}>
                              Remaining: {formatCurrency(remaining)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">No budgets set up yet</p>
                    <Link href="/budget">
                      <Button size="sm" variant="outline">Create Your First Budget</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {recsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : recommendations && recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.slice(0, 3).map((rec: any, index: number) => (
                    <div key={index} className="p-4 border border-border rounded-lg hover-elevate">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">{rec.title || 'Recommendation'}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {rec.description || rec.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Keep tracking transactions to unlock personalized insights!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FinancialHealthBreakdown 
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        healthData={healthScore}
      />

      <TransactionDialog 
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
      />
    </div>
  );
}