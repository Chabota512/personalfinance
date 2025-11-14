
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, DollarSign, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccounts, useDebt } from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/financial-utils";

interface DebtPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetItem: any;
  onPaymentComplete: () => void;
}

export function DebtPaymentDialog({
  open,
  onOpenChange,
  budgetItem,
  onPaymentComplete
}: DebtPaymentDialogProps) {
  const { toast } = useToast();
  const { data: accounts = [] } = useAccounts();
  const { data: debt } = useDebt(budgetItem?.linkedDebtId || "");
  
  const [paymentAmount, setPaymentAmount] = useState(budgetItem?.estimatedPrice || "");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const assetAccounts = accounts.filter((acc: any) => 
    acc.accountType === 'asset' && acc.isActive === 1
  );

  const handlePayment = async () => {
    if (!debt || !sourceAccountId || !paymentAmount) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Payment amount must be greater than $0",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create debt payment
      await apiRequest("POST", `/api/debts/${debt.id}/payment`, {
        amount: paymentAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        accountId: sourceAccountId,
        isExtraPayment: false,
        notes: notes || `Payment from budget: ${budgetItem.itemName}`
      });

      // Mark budget item as purchased
      await apiRequest("POST", `/api/budgets/${budgetItem.budgetId}/items/${budgetItem.id}/purchase`, {
        actualPrice: paymentAmount,
        purchaseDate: new Date().toISOString()
      });

      toast({
        title: "Payment successful!",
        description: `$${parseFloat(paymentAmount).toFixed(2)} paid toward ${debt.name}`
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      
      onPaymentComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Payment failed",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!debt) return null;

  const currentBalance = parseFloat(debt.currentBalance);
  const payment = parseFloat(paymentAmount || "0");
  const newBalance = Math.max(0, currentBalance - payment);
  const progress = ((currentBalance - newBalance) / parseFloat(debt.principalAmount)) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-600" />
            Make Debt Payment
          </DialogTitle>
          <DialogDescription>
            Pay toward your debt as part of your budget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Debt Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Debt:</span>
              <span className="font-semibold">{debt.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lender:</span>
              <span className="text-sm">{debt.creditorDebtor}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Balance:</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(currentBalance)}
              </span>
            </div>
            {debt.interestRate && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interest Rate:</span>
                <span className="text-sm">{parseFloat(debt.interestRate).toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">
              Payment Amount *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                max={currentBalance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Budgeted: {formatCurrency(parseFloat(budgetItem.estimatedPrice))}
            </p>
          </div>

          {/* Source Account */}
          <div className="space-y-2">
            <Label htmlFor="source-account">
              Pay From Account *
            </Label>
            <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
              <SelectTrigger id="source-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {assetAccounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(parseFloat(account.balance))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note about this payment"
            />
          </div>

          {/* Payment Preview */}
          {payment > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                <TrendingDown className="h-4 w-4" />
                Payment Impact
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>New Balance:</span>
                <span className="font-semibold">
                  {formatCurrency(newBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total Paid:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(parseFloat(debt.principalAmount) - newBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Progress:</span>
                <span className="font-semibold">
                  {progress.toFixed(1)}%
                </span>
              </div>
              
              {newBalance === 0 && (
                <Alert className="mt-2 bg-green-50 dark:bg-green-950 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    This payment will completely pay off this debt! 🎉
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Warnings */}
          {payment < parseFloat(budgetItem.estimatedPrice) && payment > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You're paying less than budgeted. Consider paying the full amount to stay on track.
              </AlertDescription>
            </Alert>
          )}

          {payment > parseFloat(budgetItem.estimatedPrice) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You're paying more than budgeted. This will show as overspend in your budget.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing || !sourceAccountId || payment <= 0}
          >
            {isProcessing ? "Processing..." : `Pay ${formatCurrency(payment)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
