
import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, Target } from "lucide-react";

interface Insight {
  type: 'positive' | 'negative' | 'suggestion' | 'goal';
  title: string;
  description: string;
}

interface AIInsightsCardProps {
  insights: Insight[];
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'goal':
        return <Target className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900';
      case 'negative':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'suggestion':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900';
      case 'goal':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900';
    }
  };

  if (insights.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Add a few Quick Deals and I'll start analyzing your spending patterns
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold text-foreground">AI Insights</h3>
      </div>
      {insights.map((insight, index) => (
        <Card 
          key={index} 
          className={`p-4 border ${getStyles(insight.type)}`}
        >
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              {getIcon(insight.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground mb-1">
                {insight.title}
              </h4>
              <p className="text-sm text-muted-foreground">
                {insight.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
