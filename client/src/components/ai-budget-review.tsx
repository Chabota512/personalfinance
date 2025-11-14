import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, ThumbsUp, AlertTriangle, Info, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BudgetReviewProps {
  budget: {
    categories: Array<{ category: string; amount: string; items?: any[] }>;
    totalAmount: number;
  };
  onApprove?: () => void;
  onRevise?: () => void;
}

interface AIReview {
  overallScore: number;
  verdict: "excellent" | "good" | "needs_improvement" | "risky";
  insights: Array<{
    type: "positive" | "warning" | "info" | "savings";
    title: string;
    description: string;
  }>;
  recommendations: string[];
  estimatedSavings?: number;
}

export function AIBudgetReview({ budget, onApprove, onRevise }: BudgetReviewProps) {
  const { toast } = useToast();
  const [review, setReview] = useState<AIReview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: shouldShow } = useQuery({
    queryKey: ["/api/ai/should-show-suggestions"],
  });

  const { data: review, isLoading: isReviewLoading } = useQuery({
    queryKey: ["/api/ai/review-budget", budget],
    enabled: shouldShow?.shouldShow !== false && !review,
    queryFn: async () => {
      return await apiRequest("POST", "/api/ai/review-budget", {
        categories: budget.categories,
        totalAmount: budget.totalAmount,
      });
    },
    onSuccess: (data) => {
      setReview(data);
    },
    onError: (error: any) => {
      toast({
        title: "AI Review Failed",
        description: error.message || "Could not analyze budget",
        variant: "destructive",
      });
    },
  });

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
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/ai/review-budget", {
        categories: budget.categories,
        totalAmount: budget.totalAmount,
      });
      setReview(response);
    } catch (error: any) {
      toast({
        title: "AI Review Failed",
        description: error.message || "Could not analyze budget",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  if (!shouldShow?.shouldShow && shouldShow?.engagementRate < 0.3) {
    return null;
  }

  if (!review) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Budget Review
          </CardTitle>
          <CardDescription>
            Let AI analyze your budget for potential savings and risks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runAIReview}
            disabled={isLoading}
            className="w-full gap-2"
            data-testid="button-run-ai-review"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Budget...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Get AI Review
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const verdictConfig = getVerdictConfig(review.verdict);
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
            {review.verdict === "excellent" &&
              "Your budget is well-balanced and realistic!"}
            {review.verdict === "good" &&
              "Good budget with minor improvements possible"}
            {review.verdict === "needs_improvement" &&
              "Some areas need attention to avoid overspending"}
            {review.verdict === "risky" &&
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
            {review.insights.map((insight, index) => (
              <div
                key={index}
                className="flex gap-2 p-3 rounded-lg bg-muted/50"
              >
                <div className="mt-0.5">
                  {insight.type === "positive" && (
                    <ThumbsUp className="h-4 w-4 text-success" />
                  )}
                  {insight.type === "warning" && (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  {insight.type === "info" && (
                    <Info className="h-4 w-4 text-blue-600" />
                  )}
                  {insight.type === "savings" && (
                    <TrendingDown className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {review.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Recommendations</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {review.recommendations.map((rec, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{rec}</span>
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
          {review.verdict !== "risky" && onApprove && (
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
              variant={review.verdict === "risky" ? "default" : "outline"}
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