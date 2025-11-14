import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Zap // Import Zap icon
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from '@tanstack/react-query';
import { MonthlyAccountSetupDialog } from "@/components/monthly-account-setup-dialog";
import { apiRequest } from "@/lib/queryClient";

export default function HomePage() {
  const [showQuickDeal, setShowQuickDeal] = useState(false);
  const [showMonthlySetup, setShowMonthlySetup] = useState(false);
  const queryClient = useQueryClient();

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

  return (
    <div className="min-h-screen bg-background pb-safe">
      <div className="max-w-4xl mx-auto page-shell space-y-3 md:space-y-4">

        {/* Header */}
        <div className="text-center space-y-2 py-2 md:py-3">
          <h1 className="text-display-xl md:text-display-2xl font-bold text-foreground">Your Financial Pulse</h1>
          <p className="text-body-md text-muted-foreground">Quick check-in on your money</p>
        </div>

        {/* 1. Financial Health Score - Hero Element */}
        <Card className="border-2 hover-elevate active-elevate-2" data-testid="card-health-hero">
          <CardContent className="py-6 md:py-8">
            {healthLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : healthScore ? (
              <div className="text-center space-y-3 md:space-y-4">
                <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
                  <div className="text-5xl md:text-6xl font-bold text-foreground" data-testid="text-health-score-hero">
                    {healthScore.score}
                  </div>
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    <Badge 
                      variant={getGradeBadgeVariant(healthScore.grade)} 
                      className="text-base px-4 py-1.5"
                      data-testid="badge-health-grade-hero"
                    >
                      {healthScore.grade}
                    </Badge>
                    {healthScore.aiPowered && (
                      <Badge variant="outline" className="text-body-xs px-2 py-0.5 bg-purple-500/10 border-purple-500/30">
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI-Powered
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress value={healthScore.score} className="max-w-md mx-auto h-2" />
                <p className="text-body-md md:text-body-lg text-muted-foreground max-w-md mx-auto leading-relaxed px-2">
                  {healthScore.explanation}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 md:py-12 space-y-3 md:space-y-4 px-2">
                <Sparkles className="h-10 w-10 md:h-12 md:w-12 mx-auto text-primary opacity-80" />
                <div>
                  <h3 className="text-display-sm md:text-display-md font-semibold mb-2">Welcome to Your Financial Journey!</h3>
                  <p className="text-body-sm md:text-body-md text-muted-foreground max-w-md mx-auto">
                    Start by recording your first transaction below. Your financial health score will appear once you have some activity.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-body-xs md:text-body-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>Track a few transactions to unlock your score</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. This Week's Spending */}
        <Card className="hover-elevate" data-testid="card-week-spending">
          <CardHeader>
            <CardTitle>This Week's Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-display-lg md:text-display-xl font-bold text-foreground" data-testid="text-week-spending">
                  {formatCurrency(weekSpending)}
                </div>
                <p className="text-body-sm text-muted-foreground mt-1">spent this week</p>
              </div>
              {spendingComparison && spendingComparison.hasEnoughData && (
                <div className="flex items-center gap-2">
                  {spendingComparison.isBetter ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-success" />
                      <span className="text-body-sm text-success font-medium">
                        Better than last 3 days
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5 text-destructive" />
                      <span className="text-body-sm text-destructive font-medium">
                        Not doing better
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Quick Deal Button - Primary CTA (Touch-Optimized) */}
        <QuickDealForm
          open={showQuickDeal}
          onOpenChange={setShowQuickDeal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/cash-flow'] });
          }}
          trigger={
            <Card className="bg-primary text-primary-foreground border-primary hover-elevate active-elevate-2 cursor-pointer" data-testid="card-quick-deal-cta">
              <CardContent className="p-5 md:py-8">
                <div className="text-center space-y-2 md:space-y-3">
                  <div className="text-display-md md:text-display-lg font-bold">Record a Transaction</div>
                  <p className="text-body-md text-primary-foreground/90">Tap here to log your latest transaction</p>
                  <Button size="lg" variant="secondary" className="mt-3 md:mt-4 touch-target-lg">
                    Add Quick Deal
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          }
        />

        {/* 4. Today's AI Insight */}
        {topInsight && (
          <Card className="border-purple-500/20 bg-purple-500/5 hover-elevate" data-testid="card-ai-insight">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Today's AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body-md text-foreground mb-3 leading-relaxed">
                {topInsight.description || topInsight.message}
              </p>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-body-sm flex-wrap">
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
                    className="touch-target"
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
                    className="touch-target"
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

        {/* 5. Recent Transactions */}
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
                <p className="text-body-sm">No transactions this week</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. See Full Dashboard CTA */}
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
        <div className="text-center text-body-xs text-muted-foreground space-y-1 pt-4">
          <p className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span>Tip: The dashboard has detailed charts, budgets, and goals</span>
          </p>
          <p>This page is your quick daily check-in</p>
        </div>
      </div>

      
    {/* Monthly Account Setup Dialog */}
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