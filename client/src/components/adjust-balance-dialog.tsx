
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/financial-utils";
import { AlertCircle, DollarSign } from "lucide-react";

interface AdjustBalanceDialogProps {
  account: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustBalanceDialog({ account, open, onOpenChange }: AdjustBalanceDialogProps) {
  const { toast } = useToast();
  const [actualBalance, setActualBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentBalance = parseFloat(account.balance);
  const actual = actualBalance ? parseFloat(actualBalance) : currentBalance;
  const difference = actual - currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!actualBalance || parseFloat(actualBalance) === currentBalance) {
      toast({
        title: "No adjustment needed",
        description: "The actual balance matches the current balance.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create adjustment transaction
      await apiRequest("POST", "/api/accounts/adjust-balance", {
        accountId: account.id,
        actualBalance: actualBalance,
        notes: notes || `Balance adjustment for ${account.name}`,
      });

      toast({
        title: "Balance Adjusted",
        description: `${account.name} updated to ${formatCurrency(parseFloat(actualBalance))}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      onOpenChange(false);
      setActualBalance("");
      setNotes("");
    } catch (error: any) {
      toast({
        title: "Failed to adjust balance",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Balance: {account.name}</DialogTitle>
          <DialogDescription>
            Reconcile your account with the actual balance from your bank or statement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Balance (in app)</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(currentBalance)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actual-balance">Actual Balance</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="actual-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {actualBalance && difference !== 0 && (
            <div className={`p-3 rounded-lg border ${
              difference > 0 
                ? 'bg-success/5 border-success/20' 
                : 'bg-destructive/5 border-destructive/20'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold text-sm">Adjustment Required</span>
              </div>
              <p className="text-sm">
                {difference > 0 ? 'Add' : 'Subtract'} {formatCurrency(Math.abs(difference))}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="E.g., Bank reconciliation for January 2025"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !actualBalance}
              className="flex-1"
            >
              {isSubmitting ? "Adjusting..." : "Adjust Balance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
