
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAccounts, useCreateTransaction } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransactionDialog({ open, onOpenChange, onSuccess }: TransactionDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");

  const { toast } = useToast();
  const { data: accounts } = useAccounts();
  const createTransaction = useCreateTransaction();

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setDescription("");
    setNotes("");
    setDebitAccountId("");
    setDebitAmount("");
    setCreditAccountId("");
    setCreditAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !debitAccountId || !creditAccountId || !debitAmount || !creditAmount) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const debitAmt = parseFloat(debitAmount);
    const creditAmt = parseFloat(creditAmount);

    if (Math.abs(debitAmt - creditAmt) > 0.01) {
      toast({
        title: "Error",
        description: `Debits (${debitAmt.toFixed(2)}) must equal credits (${creditAmt.toFixed(2)})`,
        variant: "destructive"
      });
      return;
    }

    try {
      await createTransaction.mutateAsync({
        date,
        description,
        notes: notes || null,
        entries: [
          { accountId: debitAccountId, entryType: 'debit', amount: debitAmount },
          { accountId: creditAccountId, entryType: 'credit', amount: creditAmount }
        ]
      });

      toast({ title: "Success", description: "Transaction recorded successfully" });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Double-Entry Transaction</DialogTitle>
          <DialogDescription>
            Enter debits and credits to maintain balanced books
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-date">Date</Label>
              <Input
                id="transaction-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-amount">Amount</Label>
              <Input
                id="total-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={debitAmount}
                onChange={(e) => {
                  setDebitAmount(e.target.value);
                  setCreditAmount(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Grocery shopping at Whole Foods"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="border border-border rounded-lg p-4 space-y-4 bg-card">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                Debit Entry
              </Badge>
              <p className="text-sm text-muted-foreground">
                Account to increase or expense to record
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="debit-account">Account</Label>
                <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                  <SelectTrigger id="debit-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.accountCategory})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="debit-amount">Amount</Label>
                <Input
                  id="debit-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={debitAmount}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-4 bg-card">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                Credit Entry
              </Badge>
              <p className="text-sm text-muted-foreground">
                Account to decrease or payment source
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit-account">Account</Label>
                <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                  <SelectTrigger id="credit-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.accountCategory})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-amount">Amount</Label>
                <Input
                  id="credit-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={creditAmount}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional transaction details"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Balance Check:</span>
            <span className={`text-sm ${
              debitAmount && creditAmount && Math.abs(parseFloat(debitAmount) - parseFloat(creditAmount)) < 0.01
                ? 'text-success'
                : 'text-muted-foreground'
            }`}>
              {debitAmount && creditAmount
                ? Math.abs(parseFloat(debitAmount) - parseFloat(creditAmount)) < 0.01
                  ? '✓ Balanced'
                  : '✗ Not balanced'
                : 'Enter amounts to check balance'}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? "Recording..." : "Record Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
