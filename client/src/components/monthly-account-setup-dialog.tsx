
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Wallet, Calendar } from "lucide-react";

interface MonthlyAccountSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MonthlyAccountSetupDialog({ open, onOpenChange, onSuccess }: MonthlyAccountSetupDialogProps) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    if (open) {
      // Get current month
      const month = new Date().toISOString().slice(0, 7);
      setCurrentMonth(month);
      
      // Fetch asset accounts
      fetch('/api/accounts', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          const assetAccounts = data.filter((a: any) => 
            a.accountType === 'asset' && a.isActive === 1
          );
          setAccounts(assetAccounts);
          
          // Auto-select checking account if available
          const checking = assetAccounts.find((a: any) => 
            a.accountCategory === 'checking'
          );
          if (checking) {
            setSelectedAccountId(checking.id);
          } else if (assetAccounts.length > 0) {
            setSelectedAccountId(assetAccounts[0].id);
          }
        })
        .catch(err => console.error('Failed to load accounts:', err));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      toast({
        title: "Please select an account",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/quick-deals/monthly-account', {
        accountId: selectedAccountId,
        month: currentMonth
      });

      toast({
        title: "✅ Account set for this month",
        description: "All Quick Deals will deduct from this account"
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to set account",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMonthName = () => {
    if (!currentMonth) return "";
    const date = new Date(currentMonth + "-01");
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Set Up Quick Deals for {getMonthName()}
          </DialogTitle>
          <DialogDescription>
            Choose which account your Quick Deal expenses will be withdrawn from this month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="account">Select Account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger id="account">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{acc.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ${parseFloat(acc.balance).toFixed(2)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This account will be used for all Quick Deal purchases this month
            </p>
          </div>

          {accounts.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No asset accounts found</p>
              <p className="text-xs">Create an account first</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Later
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={isSubmitting || !selectedAccountId}
          >
            {isSubmitting ? "Setting..." : "Set Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
