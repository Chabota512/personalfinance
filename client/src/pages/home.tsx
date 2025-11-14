import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TransactionListItem } from "@/components/transaction-list-item";
import { QuickDealForm } from "@/components/quick-deal-form";
import { formatCurrency } from "@/lib/financial-utils";
import { 
  useFinancialHealthScore,
  useTransactionsByDateRange,
  useSavingsRecommendations,
  useSpendingDaysComparison
} from "@/lib/api";
import { 
  TrendingUp, 
  TrendingDown,
  Sparkles,
  ArrowRight,
  Receipt,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { MonthlyAccountSetupDialog } from "@/components/monthly-account-setup-dialog";
import { apiRequest } from "@/lib/queryClient";
import { MobilePageShell, MobileSection } from "@/components/mobile-page-shell";
import { useIsMobile } from "@/hooks/use-mobile";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function HomePage() {
  const [showQuickDeal, setShowQuickDeal] = useState(false);
  const [showMonthlySetup, setShowMonthlySetup] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Check if monthly account setup is needed
  useEffect(() => {
    const checkMonthlySetup = async () => {
      try {
        const response = await apiRequest('GET', '/api/quick-deals/needs-setup');
        const result = await response.json();
        if (result?.needsSetup) {
          setShowMonthlySetup(true);
        }
      } catch (error) {
        console.error('Failed to check monthly setup:', error);
      }
    };

    checkMonthlySetup();
  }, []);

  // Get this week's date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDay() === 0 ? now.getDate() - 6 : now.getDate() - (now.getDay() + 6) % 7); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      startDate: startOfWeek,
      endDate: endOfWeek
    };
  }, []);

  const { data: healthScore, isLoading: healthLoading } = useFinancialHealthScore();
  const { data: weekTransactions, isLoading: transactionsLoading } = useTransactionsByDateRange(startDate, endDate);
  const { data: recommendations, isLoading: recsLoading } = useSavingsRecommendations();
  const { data: spendingComparison } = useSpendingDaysComparison();

  // Calculate this week's spending
  const weekSpending = useMemo(() => {
    if (!weekTransactions) return 0;
    return weekTransactions
      .filter((t: any) => parseFloat(t.totalAmount) < 0)
      .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.totalAmount)), 0);
  }, [weekTransactions]);

  // Get most urgent AI insight
  const topInsight = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return null;
    return recommendations[0];
  }, [recommendations]);

  const getGradeBadgeVariant = (grade: string) => {
    if (grade === 'Excellent') return 'default';
    if (grade === 'Good') return 'default';
    if (grade === 'Fair') return 'secondary';
    return 'secondary';
  };

  // Pull-to-refresh handler for mobile
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/financial-health'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/ai/recommendations'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/analytics/spending-days-comparison'] });
  }, [queryClient]);

  // Mobile ultra-compact layout
  if (isMobile) {
    return (
      <>
        <MobilePageShell className="bg-background mobile-compact">
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="mobile-space-sm">
            {/* Compact Header - 1 line only */}
            <h1 className="text-base font-bold text-center">Financial Pulse</h1>

            {/* 1. Health Score - Ultra-compact (8px padding) */}
            <Card className="p-2" data-testid="card-health-hero">
              {healthLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : healthScore ? (
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-3xl font-bold" data-testid="text-health-score-hero">
                      {healthScore.score}
                    </div>
                    <Badge 
                      variant={getGradeBadgeVariant(healthScore.grade)} 
                      className="text-xs"
                      data-testid="badge-health-grade-hero"
                    >
                      {healthScore.grade}
                    </Badge>
                  </div>
                  <Progress value={healthScore.score} className="h-1" />
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {healthScore.explanation}
                  </p>
                </div>
              ) : (
                <div className="text-center py-3 space-y-1">
                  <Sparkles className="h-6 w-6 mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">Start tracking to see your score</p>
                </div>
              )}
            </Card>

            {/* 2. Week Spending - Inline badge/chip */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-xs text-muted-foreground">This week:</span>
              <Badge variant="secondary" className="text-sm font-bold" data-testid="text-week-spending">
                {formatCurrency(weekSpending)}
              </Badge>
              {spendingComparison?.hasEnoughData && (
                spendingComparison.isBetter ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )
              )}
            </div>

            {/* 3. Quick Deal CTA - Compact button */}
            <QuickDealForm
              open={showQuickDeal}
              onOpenChange={setShowQuickDeal}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/cash-flow'] });
              }}
              trigger={
                <Button 
                  className="w-full" 
                  size="default"
                  data-testid="button-quick-deal-cta"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              }
            />

            {/* 4. AI Insight - Collapsible (hidden by default) */}
            {topInsight && (
              <Collapsible open={showInsights} onOpenChange={setShowInsights}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between text-xs"
                    data-testid="button-toggle-insights"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      AI Insight
                    </span>
                    {showInsights ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="p-2 bg-purple-500/5 border-purple-500/20" data-testid="card-ai-insight">
                    <p className="text-xs mb-2">
                      {topInsight.description || topInsight.message}
                    </p>
                    {topInsight.suggestedAmount && (
                      <Badge variant="outline" className="text-xs">
                        Save {formatCurrency(parseFloat(topInsight.suggestedAmount))}
                      </Badge>
                    )}
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* 5. Recent Transactions - Show 2, expandable */}
            <Collapsible open={showTransactions} onOpenChange={setShowTransactions}>
              <Card className="p-2" data-testid="card-recent-transactions-home">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <Receipt className="h-3 w-3" />
                    Recent
                  </span>
                  {weekTransactions && weekTransactions.length > 2 && (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs">
                        {showTransactions ? 'Less' : `+${weekTransactions.length - 2}`}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                {transactionsLoading ? (
                  <div className="space-y-1">
                    {[1, 2].map(i => (
                      <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : weekTransactions && weekTransactions.length > 0 ? (
                  <>
                    <div className="space-y-1">
                      {weekTransactions.slice(0, 2).map((transaction: any) => (
                        <TransactionListItem
                          key={transaction.id}
                          transaction={transaction}
                        />
                      ))}
                    </div>
                    <CollapsibleContent>
                      <div className="space-y-1 mt-1">
                        {weekTransactions.slice(2).map((transaction: any) => (
                          <TransactionListItem
                            key={transaction.id}
                            transaction={transaction}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No transactions</p>
                )}
              </Card>
            </Collapsible>

            {/* 6. Dashboard link */}
            <Link href="/dashboard">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                data-testid="button-see-dashboard"
              >
                Full Dashboard
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          </PullToRefresh>
        </MobilePageShell>

        <MonthlyAccountSetupDialog
          open={showMonthlySetup}
          onOpenChange={setShowMonthlySetup}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/quick-deals/monthly-account'] });
          }}
        />
      </>
    );
  }

  // Desktop layout - spacious design
  return (
    <div className="page-shell">
      <div className="section">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Financial Pulse</h1>
          <p className="text-muted-foreground mt-2">Your daily financial overview</p>
        </div>

        {/* Financial Health Score - Hero Element */}
        <Card className="border-2 hover-elevate active-elevate-2" data-testid="card-health-hero">
          <CardContent className="py-8">
            {healthLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : healthScore ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="text-6xl font-bold text-foreground" data-testid="text-health-score-hero">
                    {healthScore.score}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge 
                      variant={getGradeBadgeVariant(healthScore.grade)} 
                      className="text-base px-4 py-1.5"
                      data-testid="badge-health-grade-hero"
                    >
                      {healthScore.grade}
                    </Badge>
                    {healthScore.aiPowered && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5 bg-purple-500/10 border-purple-500/30">
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI-Powered
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress value={healthScore.score} className="max-w-md mx-auto h-2" />
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {healthScore.explanation}
                </p>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-primary opacity-80" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Welcome to Your Financial Journey!</h3>
                  <p className="text-base text-muted-foreground max-w-md mx-auto">
                    Start by recording your first transaction below. Your financial health score will appear once you have some activity.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>Track a few transactions to unlock your score</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week's Spending */}
        <Card className="hover-elevate" data-testid="card-week-spending">
          <CardHeader>
            <CardTitle>This Week's Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-3xl font-bold text-foreground" data-testid="text-week-spending">
                  {formatCurrency(weekSpending)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">spent this week</p>
              </div>
              {spendingComparison && spendingComparison.hasEnoughData && (
                <div className="flex items-center gap-2">
                  {spendingComparison.isBetter ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-success" />
                      <span className="text-sm text-success font-medium">
                        Better than last 3 days
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5 text-destructive" />
                      <span className="text-sm text-destructive font-medium">
                        Not doing better
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Deal Button - Primary CTA */}
        <QuickDealForm
          open={showQuickDeal}
          onOpenChange={setShowQuickDeal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/cash-flow'] });
          }}
          trigger={
            <Card className="bg-primary text-primary-foreground border-primary hover-elevate active-elevate-2 cursor-pointer" data-testid="card-quick-deal-cta">
              <CardContent className="py-8">
                <div className="text-center space-y-3">
                  <div className="text-2xl font-bold">Record a Transaction</div>
                  <p className="text-base text-primary-foreground/90">Tap here to log your latest transaction</p>
                  <Button size="lg" variant="secondary" className="mt-4">
                    Add Quick Deal
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          }
        />

        {/* Today's AI Insight */}
        {topInsight && (
          <Card className="border-purple-500/20 bg-purple-500/5 hover-elevate" data-testid="card-ai-insight">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Today's AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-foreground mb-3 leading-relaxed">
                {topInsight.description || topInsight.message}
              </p>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {topInsight.confidence && (
                    <Badge variant="outline">
                      {topInsight.confidence}% confidence
                    </Badge>
                  )}
                  {topInsight.suggestedAmount && (
                    <span className="font-semibold text-success">
                      Save {formatCurrency(parseFloat(topInsight.suggestedAmount))}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await apiRequest('POST', '/api/ai/insights-feedback', {
                          insightId: topInsight.id,
                          helpful: true
                        });
                      } catch (error) {
                        console.error('Failed to record feedback:', error);
                      }
                    }}
                    aria-label="Mark helpful"
                  >
                    <TrendingUp className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await apiRequest('POST', '/api/ai/insights-feedback', {
                          insightId: topInsight.id,
                          helpful: false
                        });
                      } catch (error) {
                        console.error('Failed to record feedback:', error);
                      }
                    }}
                    aria-label="Mark not helpful"
                  >
                    <TrendingDown className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card data-testid="card-recent-transactions-home">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
                ))}
              </div>
            ) : weekTransactions && weekTransactions.length > 0 ? (
              <div className="space-y-1">
                {weekTransactions.slice(0, 5).map((transaction: any) => (
                  <TransactionListItem
                    key={transaction.id}
                    transaction={transaction}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transactions this week</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* See Full Dashboard CTA */}
        <Link href="/dashboard">
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full hover-elevate"
            data-testid="button-see-dashboard"
          >
            See Full Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>

        {/* Helper text */}
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-4">
          <p className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span>Tip: The dashboard has detailed charts, budgets, and goals</span>
          </p>
          <p>This page is your quick daily check-in</p>
        </div>
      </div>

      <MonthlyAccountSetupDialog
        open={showMonthlySetup}
        onOpenChange={setShowMonthlySetup}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/quick-deals/monthly-account'] });
        }}
      />
    </div>
  );
}