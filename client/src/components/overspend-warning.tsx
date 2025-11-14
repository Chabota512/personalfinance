import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lightbulb, X } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

type BudgetSpending = {
  spent: number;
  budget: {
    allocatedAmount: string;
  };
  [key: string]: any;
};

interface OverspendWarningProps {
  budgetId: string;
  categoryId?: string;
  currentSpent: number;
  budgetLimit: number;
  onDismiss?: () => void;
}

interface AISuggestion {
  alternatives: string[];
  savings: number;
}

export function OverspendWarning({
  budgetId,
  categoryId,
  currentSpent,
  budgetLimit,
  onDismiss,
}: OverspendWarningProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const overspent = currentSpent - budgetLimit;
  const percentOver = ((currentSpent / budgetLimit) * 100) - 100;

  const { data: budgetSpending } = useQuery<BudgetSpending>({
    queryKey: [`/api/budgets/${budgetId}/spending`],
    enabled: !!budgetId,
  });

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await apiRequest(
          "POST",
          "/api/ai/overspend-suggestions",
          {
            budgetId,
            categoryId,
            overspentAmount: overspent,
          }
        );
        setSuggestions(response);
      } catch (error) {
        // Silently fail - suggestions are optional
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    if (overspent > 0) {
      fetchSuggestions();
    }
  }, [budgetId, categoryId, overspent]);

  if (overspent <= 0) return null;

  const severity = percentOver > 50 ? "critical" : percentOver > 20 ? "high" : "medium";

  return (
    <Alert variant={severity === "critical" ? "destructive" : "default"} className="relative">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onDismiss}
          data-testid="button-dismiss-warning"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {severity === "critical" && "🚨 Critical Overspending"}
        {severity === "high" && "⚠️ High Overspending"}
        {severity === "medium" && "⚠️ Budget Exceeded"}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          You've exceeded your budget by{" "}
          <span className="font-semibold">{formatCurrency(overspent)}</span>{" "}
          ({percentOver.toFixed(0)}% over limit)
        </p>

        {isLoadingSuggestions && (
          <p className="text-xs flex items-center gap-1">
            <Lightbulb className="h-3 w-3 animate-pulse" />
            Getting AI suggestions...
          </p>
        )}

        {suggestions && suggestions.alternatives.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              AI Suggestions to Get Back on Track:
            </p>
            <ul className="text-xs space-y-1 pl-4">
              {suggestions.alternatives.map((alt, index) => (
                <li key={index} className="list-disc">
                  {alt}
                </li>
              ))}
            </ul>
            {suggestions.savings > 0 && (
              <p className="text-xs text-muted-foreground">
                Potential savings: {formatCurrency(suggestions.savings)}
              </p>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}