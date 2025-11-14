import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, ThumbsUp, AlertTriangle, Info, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BudgetReviewProps {
  budgetId: string;
  onApprove?: () => void;
  onRevise?: () => void;
}

type AIReview = {
  shouldShow: boolean;
  engagementRate: number;
  insights: Array<{
    type: string;
    message: string;
    category?: string;
    severity?: string;
  }>;
  recommendations: Array<{
    action: string;
    impact: string;
    category?: string;
  }>;
};

export function AIBudgetReview({ budgetId, onApprove, onRevise }: BudgetReviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: review, isLoading } = useQuery<AIReview>({
    queryKey: [`/api/budgets/${budgetId}/ai-review`],
    enabled: !!budgetId,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  useEffect(() => {
    if (review?.shouldShow && review.engagementRate < 50) {
      // Show notification or toast
      console.log('Low engagement detected - consider showing reminder');
    }
  }, [review]);

  const trackAction = useMutation({
    mutationFn: async (action: string) => {
      const res = await fetch("/api/ai/track-suggestion-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          suggestionId: `budget-${Date.now()}`,
        }),
      });
      return res.json();
    },
  });

  const runAIReview = async () => {
    try {
      const response = await apiRequest("POST", `/api/budgets/${budgetId}/ai-review`);
      queryClient.setQueryData([`/api/budgets/${budgetId}/ai-review`], response);
    } catch (error: any) {
      toast({
        title: "AI Review Failed",
        description: error.message || "Could not analyze budget",
        variant: "destructive",
      });
    }
  };

  const getVerdictConfig = (verdict: string) => {
    switch (verdict) {
      case "excellent":
        return {
          icon: ThumbsUp,
          color: "text-success",
          bgColor: "bg-success/10",
          label: "Excellent Budget",
        };
      case "good":
        return {
          icon: Info,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          label: "Good Budget",
        };
      case "needs_improvement":
        return {
          icon: AlertTriangle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          label: "Needs Improvement",
        };
      case "risky":
        return {
          icon: AlertTriangle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          label: "Risky Budget",
        };
      default:
        return {
          icon: Info,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          label: "Unknown",
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Budget Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Analyzing your budget...</p>
        </CardContent>
      </Card>
    );
  }

  if (!review || !review.shouldShow) {
    return null;
  }

  const insights: AIReview['insights'] = review.insights || [];
  const recommendations: AIReview['recommendations'] = review.recommendations || [];
  const verdictConfig = getVerdictConfig(review.severity); // Assuming review.severity maps to verdict
  const VerdictIcon = verdictConfig.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Budget Analysis
          </CardTitle>
          <Badge variant="outline" className={`${verdictConfig.color} border-current`}>
            Score: {review.overallScore}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verdict */}
        <Alert className={verdictConfig.bgColor}>
          <VerdictIcon className={`h-4 w-4 ${verdictConfig.color}`} />
          <AlertTitle className={verdictConfig.color}>
            {verdictConfig.label}
          </AlertTitle>
          <AlertDescription>
            {review.severity === "excellent" &&
              "Your budget is well-balanced and realistic!"}
            {review.severity === "good" &&
              "Good budget with minor improvements possible"}
            {review.severity === "needs_improvement" &&
              "Some areas need attention to avoid overspending"}
            {review.severity === "risky" &&
              "High risk of overspending - please revise"}
          </AlertDescription>
        </Alert>

        {/* Estimated Savings */}
        {review.estimatedSavings && review.estimatedSavings > 0 && (
          <Alert className="bg-success/10 border-success">
            <TrendingDown className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Potential Savings</AlertTitle>
            <AlertDescription>
              You could save ${review.estimatedSavings.toFixed(2)} by following
              our recommendations
            </AlertDescription>
          </Alert>
        )}

        {/* Insights */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Key Insights</h4>
          <div className="space-y-2">
            {insights.map((insight, index) => {
              const insightConfig = getVerdictConfig(insight.severity || "info");
              const InsightIcon = insightConfig.icon;
              return (
                <div
                  key={index}
                  className="flex gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <div className="mt-0.5">
                    <InsightIcon className={`h-4 w-4 ${insightConfig.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{insight.message}</p>
                    {insight.category && (
                      <p className="text-xs text-muted-foreground">{insight.category}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Recommendations</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  <div className="flex-1">
                    <p>{rec.action}</p>
                    <p className="text-xs text-muted-foreground">{rec.impact}</p>
                    {rec.category && (
                      <p className="text-xs text-muted-foreground">{rec.category}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      trackAction.mutate("apply");
                      toast({ title: "Applied", description: "Suggestion applied" });
                    }}
                  >
                    Apply Suggestion
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {review.severity !== "risky" && onApprove && (
            <Button
              onClick={() => {
                trackAction.mutate("approve");
                onApprove();
              }}
              className="flex-1"
              data-testid="button-approve-budget"
            >
              Approve & Activate
            </Button>
          )}
          {onRevise && (
            <Button
              onClick={() => {
                trackAction.mutate("revise");
                onRevise();
              }}
              variant={review.severity === "risky" ? "default" : "outline"}
              className="flex-1"
              data-testid="button-revise-budget"
            >
              Revise Budget
            </Button>
          )}
        </div>

        <Button
          onClick={() => {
            trackAction.mutate("rerun");
            runAIReview();
          }}
          variant="ghost"
          className="w-full text-xs"
          data-testid="button-rerun-review"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Re-run Analysis
        </Button>
      </CardContent>
    </Card>
  );
}