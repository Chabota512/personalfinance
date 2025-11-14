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
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";

interface InsufficientFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  availableBalance: number;
  requiredAmount: number;
  onProceed: () => void;
  onCancel: () => void;
}

export function InsufficientFundsDialog({
  open,
  onOpenChange,
  accountName,
  availableBalance,
  requiredAmount,
  onProceed,
  onCancel,
}: InsufficientFundsDialogProps) {
  const shortage = requiredAmount - availableBalance;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-insufficient-funds">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Insufficient Funds</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-4">
            <p>
              This transaction requires {formatCurrency(requiredAmount)}, but your{" "}
              <span className="font-semibold">{accountName}</span> only has{" "}
              {formatCurrency(availableBalance)} available.
            </p>
            <div className="rounded-md bg-muted p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available:</span>
                <span className="font-medium">{formatCurrency(availableBalance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Required:</span>
                <span className="font-medium">{formatCurrency(requiredAmount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1 mt-1">
                <span className="text-muted-foreground">Short by:</span>
                <span className="font-semibold text-destructive">
                  {formatCurrency(shortage)}
                </span>
              </div>
            </div>
            <p className="text-sm">
              Would you like to proceed anyway? This may result in an overdraft or
              require transferring funds from another account.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="button-cancel-transaction">
            Cancel Transaction
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onProceed}
            className="bg-destructive hover:bg-destructive/90"
            data-testid="button-proceed-anyway"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
