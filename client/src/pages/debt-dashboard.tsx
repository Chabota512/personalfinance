
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingDown, DollarSign, Target, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/financial-utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function DebtDashboard() {
  const { data: healthScore, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/debts/health-score'],
  });

  const { data: activeDebts } = useQuery({
    queryKey: ['/api/debts/active'],
  });

  if (healthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Calculating debt health...</p>
        </div>
      </div>
    );
  }

  if (!healthScore || healthScore.message) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Debt Dashboard</h1>
          <Link href="/debts">
            <Button>Manage Debts</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Debt Free!</h3>
            <p className="text-muted-foreground">You have no active debts. Keep up the great work!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gradeColors = {
    'Excellent': 'text-green-600',
    'Good': 'text-blue-600',
    'Fair': 'text-yellow-600',
    'Needs Attention': 'text-orange-600',
    'Critical': 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Debt Dashboard</h1>
        <Link href="/debts">
          <Button>Manage Debts</Button>
        </Link>
      </div>

      {/* Health Score Card */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Health Score</CardTitle>
          <CardDescription>Your overall debt management performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-6xl font-bold ${gradeColors[healthScore.grade as keyof typeof gradeColors]}`}>
                {healthScore.score}
              </div>
              <Badge variant="outline" className="mt-2">
                {healthScore.grade}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Debt</div>
              <div className="text-2xl font-bold">{formatCurrency(healthScore.totalDebt)}</div>
              <div className="text-sm text-muted-foreground mt-2">Monthly Payments</div>
              <div className="text-xl font-semibold">{formatCurrency(healthScore.totalMonthlyPayments)}</div>
            </div>
          </div>
          <Progress value={healthScore.score} className="h-3" />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debt-to-Income</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore.debtToIncomeRatio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {healthScore.debtToIncomeRatio > 36 ? 'Above recommended' : 'Healthy range'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Consistency</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore.paymentConsistency.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Last 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Debts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDebts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Being managed</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Health Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthScore.factors.map((factor: any, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{factor.name}</span>
                <span className="text-sm text-muted-foreground">{factor.score}/100</span>
              </div>
              <Progress value={factor.score} className="h-2" />
              <p className="text-sm text-muted-foreground">{factor.explanation}</p>
              <p className="text-sm font-medium">{factor.suggestion}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {healthScore.aiRecommendations && healthScore.aiRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Recommendations</CardTitle>
            <CardDescription>Personalized suggestions to improve your debt health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthScore.aiRecommendations.map((rec: string, index: number) => (
              <Alert key={index}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{rec}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
