import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, TrendingDown, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BudgetCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: {
    id: string;
    category: string;
    allocatedAmount: string;
  };
  stats: {
    totalItems: number;
    purchasedItems: number;
    totalEstimated: number;
    totalActual: number;
    savings: number;
  };
}

export function BudgetCompletionDialog({
  open,
  onOpenChange,
  budget,
  stats,
}: BudgetCompletionDialogProps) {
  const { toast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);

  const completionRate = (stats.purchasedItems / stats.totalItems) * 100;
  const savingsRate = ((stats.savings / stats.totalEstimated) * 100) || 0;

  const handleComplete = async () => {
    if (isCompleting) return; // Prevent multiple submissions

    setIsCompleting(true);
    try {
      // Mark budget as completed and create transaction
      await apiRequest("POST", `/api/budgets/${budget.id}/complete`, {
        totalActual: stats.totalActual,
        savings: stats.savings,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      toast({
        title: "Budget Completed!",
        description: `Saved ${formatCurrency(stats.savings)} on this shopping trip`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete budget",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Complete Budget
          </DialogTitle>
          <DialogDescription>
            Review your shopping results before marking this budget as complete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Completion Progress */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items Purchased</span>
                <span className="font-semibold">
                  {stats.purchasedItems} / {stats.totalItems}
                </span>
              </div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {completionRate.toFixed(0)}% complete
              </p>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>Budgeted</span>
                </div>
                <p className="text-lg font-bold">
                  {formatCurrency(stats.totalEstimated)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>Actual</span>
                </div>
                <p className="text-lg font-bold">
                  {formatCurrency(stats.totalActual)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Savings/Overspend */}
          <Card
            className={
              stats.savings >= 0
                ? "border-success bg-success/5"
                : "border-destructive bg-destructive/5"
            }
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {stats.savings >= 0 ? (
                    <TrendingDown className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {stats.savings >= 0 ? "Total Savings" : "Overspent"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {savingsRate >= 0
                        ? `${savingsRate.toFixed(1)}% saved`
                        : `${Math.abs(savingsRate).toFixed(1)}% over budget`}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    stats.savings >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(Math.abs(stats.savings))}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Performance Badge */}
          <div className="flex justify-center">
            {savingsRate > 10 && (
              <Badge variant="outline" className="text-success border-success">
                🏆 Great Job! Stayed under budget
              </Badge>
            )}
            {savingsRate >= 0 && savingsRate <= 10 && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                ✅ Good! On budget
              </Badge>
            )}
            {savingsRate < 0 && (
              <Badge variant="outline" className="text-destructive border-destructive">
                ⚠️ Over budget - adjust next time
              </Badge>
            )}
          </div>

          {/* Warning for incomplete */}
          {completionRate < 100 && (
            <p className="text-xs text-center text-muted-foreground">
              Note: You haven't purchased all items. Remaining items will be marked as skipped.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isCompleting}
              data-testid="button-cancel-completion"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleComplete}
              disabled={isCompleting}
              data-testid="button-confirm-completion"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Budget
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}