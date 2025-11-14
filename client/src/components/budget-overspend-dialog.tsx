import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";

interface BudgetOverspendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  budgetLimit: number;
  currentSpent: number;
  transactionAmount: number;
  onProceed: () => void;
  onCancel: () => void;
}

export function BudgetOverspendDialog({
  open,
  onOpenChange,
  categoryName,
  budgetLimit,
  currentSpent,
  transactionAmount,
  onProceed,
  onCancel,
}: BudgetOverspendDialogProps) {
  const newTotal = currentSpent + transactionAmount;
  const overage = newTotal - budgetLimit;
  const percentUsed = (newTotal / budgetLimit) * 100;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-budget-overspend">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
              <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <AlertDialogTitle>Budget Alert</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-4">
            <p>
              This {formatCurrency(transactionAmount)} transaction will exceed your{" "}
              <span className="font-semibold">{categoryName}</span> budget.
            </p>
            <div className="rounded-md bg-muted p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget Limit:</span>
                <span className="font-medium">{formatCurrency(budgetLimit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Spent:</span>
                <span className="font-medium">{formatCurrency(currentSpent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">This Transaction:</span>
                <span className="font-medium">{formatCurrency(transactionAmount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="text-muted-foreground">New Total:</span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-500">
                  {formatCurrency(newTotal)} ({percentUsed.toFixed(0)}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Over Budget By:</span>
                <span className="font-semibold text-destructive">
                  {formatCurrency(overage)}
                </span>
              </div>
            </div>
            <p className="text-sm">
              Consider adjusting your budget or finding a more cost-effective alternative.
              Would you like to proceed with this transaction?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="button-cancel-transaction-budget">
            Cancel Transaction
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onProceed}
            data-testid="button-proceed-anyway-budget"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
