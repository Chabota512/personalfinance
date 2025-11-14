import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { getRecommendations } from "@/lib/api";

export function SavingsRecommendation() {
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["/api/ai/recommendations"],
    queryFn: getRecommendations,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription>Loading personalized advice...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return variants[priority] || "secondary";
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      savings: "border-green-500",
      debt: "border-red-500",
      budget: "border-blue-500",
      goal: "border-yellow-500",
      investment: "border-purple-500",
    };
    return colors[category] || "border-gray-500";
  };

  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      savings: TrendingUp,
      debt: AlertCircle,
      budget: CheckCircle,
      goal: Lightbulb,
      investment: TrendingUp,
    };
    const Icon = icons[type] || Lightbulb;
    return <Icon className="h-4 w-4" />;
  };

  const topRecommendations = recommendations?.slice(0, 3) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Recommendations
        </CardTitle>
        <CardDescription>Personalized financial advice based on your data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topRecommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keep tracking your finances to receive personalized recommendations.
          </p>
        ) : (
          topRecommendations.map((rec: any) => (
            <div key={rec.id} className={`border rounded-lg p-4 space-y-3 ${getCategoryColor(rec.category)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getIcon(rec.category)}
                  <h4 className="font-semibold text-sm">{rec.title}</h4>
                </div>
                <Badge variant={getPriorityBadge(rec.confidence)}>
                  {rec.confidence}% confident
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{rec.description}</p>

              {rec.suggestedAmount && parseFloat(rec.suggestedAmount) > 0 && (
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs font-medium">💰 Suggested Amount: ${parseFloat(rec.suggestedAmount).toFixed(2)}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded">{rec.category.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))
        )}

        {recommendations && recommendations.length > 3 && (
          <Button variant="outline" className="w-full" size="sm">
            View All {recommendations.length} Recommendations
          </Button>
        )}
      </CardContent>
    </Card>
  );
}