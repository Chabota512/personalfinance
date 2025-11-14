
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getHealthScore } from "@/lib/api";

export function FinancialHealthScore() {
  const { data: healthScore, isLoading, isError } = useQuery({
    queryKey: ["/api/analytics/health-score"],
    queryFn: getHealthScore,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !healthScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Start tracking your finances to see your health score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <TrendingUp className="h-12 w-12 mx-auto text-primary opacity-50" />
            <p className="text-muted-foreground">
              Record a few transactions to unlock your personalized financial health score
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeBadge = (grade: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Excellent: "default",
      Good: "secondary",
      Fair: "secondary",
      "Needs Improvement": "destructive",
    };
    return variants[grade] || "secondary";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Health Score</CardTitle>
        <CardDescription>Overall financial wellness assessment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getScoreColor(healthScore.score)}`}>
              {healthScore.score}
            </div>
            <div>
              <Badge variant={getGradeBadge(healthScore.grade)}>
                {healthScore.grade}
              </Badge>
            </div>
          </div>
        </div>
        
        <Progress value={healthScore.score} className="h-3" />
        
        <div className="space-y-3 mt-6">
          <h4 className="font-semibold text-sm">Score Breakdown</h4>
          {healthScore.factors.map((factor: any) => (
            <div key={factor.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{factor.name}</span>
                <span className="font-medium">{Math.round(factor.score)}/100</span>
              </div>
              <Progress value={factor.score} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
